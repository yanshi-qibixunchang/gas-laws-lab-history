import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import {
  Canvas,
  createPointerEvents,
  useFrame,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PromptViewportFeedback } from '../../components/prompts/PromptViewportFeedback.tsx';
import { PROMPT_FEEDBACK_COPY } from '../../components/prompts/promptFeedbackCopy.ts';
import {
  createPromptViewportFeedbackMessage,
  type PromptViewportFeedbackMessage,
} from '../../components/prompts/promptViewportFeedbackController.ts';
import {
  getPistonOscillationTrajectorySampleAt,
  simulatePistonOscillationRelease,
  type PistonOscillationTrajectory,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  type PistonOscillationGuideAction,
  type PistonOscillationGuideActionContext,
  type PistonOscillationGuideGuardResult,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type { WorkbenchPistonOscillationCameraPreset } from '../workbench/workbenchState.ts';
import usePreviewOverlayMotion from '../workbench/usePreviewOverlayMotion.ts';
import { PistonOscillationInstrumentAsset } from './PistonOscillationInstrumentModel.tsx';
import {
  PistonOscillationInteractiveModel,
  PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS,
  type PistonOscillationDemoFocusTarget,
} from './PistonOscillationInteractiveModel.tsx';
import { PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES } from './pistonOscillationCameraViews.ts';
import type {
  PistonOscillationLivePhysicalState,
} from './pistonOscillationLivePressureChannel.ts';
import { PISTON_MODEL_HIT_TARGETS } from './pistonOscillationModelHitTargets.ts';
import {
  PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MIN_MM,
  PISTON_LOCKING_SCREW_LOCK_THRESHOLD,
  PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2,
  clampPistonEquilibriumHeightMm,
  getPistonLockingScrewClampState,
  getPistonUnsupportedDropAccelerationScale,
} from './pistonOscillationModelMotion.ts';
import {
  PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS,
  PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA,
  PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA,
  getPistonHeightAdjustmentCameraDefinition,
  type PistonOscillationFocusCameraDefinition,
} from './pistonOscillationFocusViews.ts';
import {
  getPistonOscillationAutomaticOperationMirrorView,
  togglePistonOscillationOperationMirrorView,
  type PistonOscillationHeightAdjustmentStage,
  type PistonOscillationOperationMirrorView,
} from './pistonOscillationOperationMirror.ts';
import type { PistonOscillationReleaseEvent } from './PistonOscillationAcquisitionPanel.tsx';
import type { PistonOscillationDemoFrame } from './pistonOscillationDemoTimeline.ts';
import {
  PistonOscillationOperationCueView,
  PistonOscillationOperationVisualizationToggle,
} from './PistonOscillationOperationVisualization.tsx';
import type {
  PistonOscillationMouseAction,
  PistonOscillationOperationCue,
} from './pistonOscillationOperationVisualizationModel.ts';
import {
  resolvePistonOscillationGuideHeightSnap,
  type PistonOscillationGuideFocusMode,
  type PistonOscillationGuideInstrumentRestoreState,
} from './pistonOscillationGuidePresentation.ts';
import {
  getPistonOscillationShellCopy,
  type PistonOscillationLanguage,
} from './pistonOscillationCopy.ts';
import '../workbench/WorkbenchStudioPrototype.css';
import './PistonOscillationInteractionWorkspace.css';

export type PistonOscillationFocusMode = 'overview' | 'pistonFocus' | 'hoseFocus' | 'powerFocus';
export type PistonOscillationHoseConnectionState = 'connected' | 'disconnected';
export type PistonInteractionPhase =
  | 'idle'
  | 'ready'
  | 'pressing'
  | 'adjustingHeight'
  | 'holding'
  | 'falling'
  | 'rebounding';
type PistonPlatformMode = 'press' | 'adjustHeight' | 'screwLocked';

export interface PistonOscillationGuideInstrumentSnapshot {
  focusMode: PistonOscillationFocusMode;
  hoseState: PistonOscillationHoseConnectionState;
  hoseDragging: boolean;
  equilibriumHeightMm: number;
  pistonOffsetMm: number;
  lockingScrewProgress: number;
  lockingScrewState: 'loose' | 'locked';
  heightAdjustmentStage: PistonOscillationHeightAdjustmentStage;
  spaceHeld: boolean;
  mouseHeld: boolean;
  pistonPhase: PistonInteractionPhase;
}

export interface PistonOscillationGuideSupportLossEvent {
  type: 'supportLost';
  heightMm: number;
}

export interface PistonOscillationGuideHeightResetRequest {
  revision: number;
  phase: 'resetting' | 'explaining';
  startedHeightMm: number;
}

export type PistonOscillationGuideActionAttempt = (
  action: PistonOscillationGuideAction,
  context: PistonOscillationGuideActionContext,
) => PistonOscillationGuideGuardResult;

export type PistonOscillationGuideVisualCue =
  | 'power'
  | 'platform'
  | 'screw'
  | 'hoseDisconnect'
  | 'hoseReconnect'
  | 'hoseSnap'
  | 'mirrorOutline'
  | 'heightStageAction'
  | null;

interface PistonOscillationSceneBounds {
  center: THREE.Vector3;
  span: number;
}

interface PistonOscillationFocusPose extends PistonOscillationFocusCameraDefinition {}

interface CameraTransition {
  startedAtMs: number;
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  fromFov: number;
  toPose: PistonOscillationFocusPose;
}

interface ProjectedHoseHandleBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ProjectedPowerButtonBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface HoseHandleBounds {
  connected: ProjectedHoseHandleBounds;
  detached: ProjectedHoseHandleBounds;
}

const FOCUS_TRANSITION_DURATION_MS = 360;
const PISTON_PRESS_DEFAULT_MAX_OFFSET_MM = 12;
const PISTON_PRESS_DRAG_RANGE_PX = 150;
const PISTON_REBOUND_VISIBLE_DURATION_MS = 800;
const PISTON_HEIGHT_DRAG_MM_PER_PX = 0.3;
const PISTON_GUIDE_HEIGHT_RESET_MIN_DURATION_MS = 520;
const PISTON_GUIDE_HEIGHT_RESET_MAX_DURATION_MS = 820;
const PISTON_GUIDE_SCREW_DIRECTION_THRESHOLD = 0.0025;
const isEditableKeyboardTarget = (target: EventTarget | null) => target instanceof HTMLElement
  && Boolean(target.closest('input, select, textarea, [contenteditable="true"]'));
const createPistonOscillationPointerEvents: typeof createPointerEvents = (store) => {
  const pointerEvents = createPointerEvents(store);
  return {
    ...pointerEvents,
    compute: (event, state) => {
      const bounds = state.gl.domElement.getBoundingClientRect();
      const width = bounds.width || state.size.width;
      const height = bounds.height || state.size.height;
      const x = 'clientX' in event ? event.clientX - bounds.left : 0;
      const y = 'clientY' in event ? event.clientY - bounds.top : 0;
      state.pointer.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    },
  };
};
const createOverviewPose = (
  bounds: PistonOscillationSceneBounds,
  cameraPreset: WorkbenchPistonOscillationCameraPreset,
): PistonOscillationFocusPose => {
  if (cameraPreset === 'overview') return PISTON_OSCILLATION_CONFIRMED_OVERVIEW_CAMERA;
  const scheme = PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES[cameraPreset];
  const target = bounds.center.clone().add(new THREE.Vector3(...scheme.targetOffset));
  const position = target.clone().add(
    new THREE.Vector3(...scheme.direction).multiplyScalar(bounds.span * 1.32),
  );
  return {
    viewport: { width: 796, height: 500 },
    position: position.toArray(),
    target: target.toArray(),
    fov: scheme.fov,
    zoom: 1,
    near: 0.001,
    far: 20,
  };
};

export const offsetPistonOscillationOverviewPoseForHeight = (
  pose: PistonOscillationFocusPose,
  heightMm: number,
): PistonOscillationFocusPose => {
  const heightOffsetM = clampPistonEquilibriumHeightMm(heightMm) / 1000;
  return {
    ...pose,
    viewport: { ...pose.viewport },
    position: [pose.position[0], pose.position[1] + heightOffsetM, pose.position[2]],
    target: [pose.target[0], pose.target[1] + heightOffsetM, pose.target[2]],
  };
};

const applyPose = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl,
  pose: PistonOscillationFocusPose,
) => {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.zoom = pose.zoom;
  camera.near = pose.near;
  camera.far = pose.far;
  camera.updateProjectionMatrix();
  controls.target.set(...pose.target);
  controls.update();
};

const MainCameraRig = ({
  bounds,
  mode,
  cameraPreset,
  poseOverride,
  poseKeyOverride,
  controlsRef,
  onTransitionActiveChange,
}: {
  bounds: PistonOscillationSceneBounds | null;
  mode: PistonOscillationFocusMode;
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  poseOverride?: PistonOscillationFocusPose;
  poseKeyOverride?: string;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  onTransitionActiveChange: (active: boolean) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const transitionRef = useRef<CameraTransition | null>(null);
  const appliedPoseKeyRef = useRef<string | null>(null);
  const poseKey = poseKeyOverride ?? `${mode}:${cameraPreset}`;
  const pose = useMemo(() => {
    if (poseOverride) return poseOverride;
    if (!bounds) return null;
    return mode === 'overview'
      ? createOverviewPose(bounds, cameraPreset)
      : PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS[mode];
  }, [bounds, cameraPreset, mode, poseOverride]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!pose || !controls || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (appliedPoseKeyRef.current === null) {
      applyPose(camera, controls, pose);
      appliedPoseKeyRef.current = poseKey;
      invalidate();
      return;
    }
    if (appliedPoseKeyRef.current === poseKey) return;
    transitionRef.current = {
      startedAtMs: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPose: pose,
    };
    appliedPoseKeyRef.current = poseKey;
    onTransitionActiveChange(true);
    invalidate();
  }, [camera, controlsRef, invalidate, onTransitionActiveChange, pose, poseKey]);

  useFrame(() => {
    const transition = transitionRef.current;
    const controls = controlsRef.current;
    if (!transition || !controls || !(camera instanceof THREE.PerspectiveCamera)) return;
    const progress = Math.min(
      1,
      Math.max(0, performance.now() - transition.startedAtMs) / FOCUS_TRANSITION_DURATION_MS,
    );
    const eased = 1 - ((1 - progress) ** 3);
    camera.position.lerpVectors(
      transition.fromPosition,
      new THREE.Vector3(...transition.toPose.position),
      eased,
    );
    controls.target.lerpVectors(
      transition.fromTarget,
      new THREE.Vector3(...transition.toPose.target),
      eased,
    );
    camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toPose.fov, eased);
    camera.updateProjectionMatrix();
    controls.update();
    if (progress >= 1) {
      applyPose(camera, controls, transition.toPose);
      transitionRef.current = null;
      onTransitionActiveChange(false);
      return;
    }
    invalidate();
  });

  return null;
};

const FixedCameraRig = ({
  pose,
  controlsRef,
}: {
  pose: PistonOscillationFocusPose;
  controlsRef?: React.MutableRefObject<OrbitControlsImpl | null>;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = controlsRef?.current;
    if (controls) applyPose(camera, controls, pose);
    else {
      camera.position.set(...pose.position);
      camera.fov = pose.fov;
      camera.zoom = pose.zoom;
      camera.near = pose.near;
      camera.far = pose.far;
      camera.lookAt(new THREE.Vector3(...pose.target));
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, controlsRef, invalidate, pose]);

  return null;
};

const HeightFollowingCameraRig = ({
  enabled,
  heightMm,
  controlsRef,
}: {
  enabled: boolean;
  heightMm: number;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const previousHeightMmRef = useRef(heightMm);

  useLayoutEffect(() => {
    const previousHeightMm = previousHeightMmRef.current;
    previousHeightMmRef.current = heightMm;
    if (!enabled || !(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const heightDeltaM = (heightMm - previousHeightMm) / 1000;
    if (Math.abs(heightDeltaM) < 1e-9) return;
    camera.position.y += heightDeltaM;
    controls.target.y += heightDeltaM;
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }, [camera, controlsRef, enabled, heightMm, invalidate]);

  return null;
};

const ScaleReadingCameraRig = ({
  heightMm: _heightMm,
  controlsRef,
}: {
  heightMm: number;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const appliedRef = useRef(false);
  const lastCenterWorldYRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const controls = controlsRef.current;
    if (!controls || appliedRef.current) return;
    const initialPose = PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA;
    camera.position.set(...initialPose.position);
    camera.zoom = initialPose.zoom * (size.height / initialPose.viewport.height);
    camera.near = initialPose.near;
    camera.far = initialPose.far;
    camera.updateProjectionMatrix();
    controls.target.set(...initialPose.target);
    controls.update();
    appliedRef.current = true;
    invalidate();
  }, [camera, controlsRef, invalidate, size.height]);

  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const controls = controlsRef.current;
    const graphitePiston = scene.getObjectByName('Piston_Graphite');
    const glassCylinder = scene.getObjectByName('Cylinder_Pyrex');
    if (!controls || !graphitePiston || !glassCylinder) return;
    const pistonBounds = new THREE.Box3().setFromObject(graphitePiston, true);
    const cylinderBounds = new THREE.Box3().setFromObject(glassCylinder, true);
    if (pistonBounds.isEmpty() || cylinderBounds.isEmpty()) return;
    const visibleHalfHeightM = (camera.top - camera.bottom) / (camera.zoom * 2);
    const minimumCenterWorldY = cylinderBounds.min.y + visibleHalfHeightM;
    const maximumCenterWorldY = cylinderBounds.max.y - visibleHalfHeightM;
    const centerWorldY = minimumCenterWorldY <= maximumCenterWorldY
      ? THREE.MathUtils.clamp(
        pistonBounds.min.y,
        minimumCenterWorldY,
        maximumCenterWorldY,
      )
      : pistonBounds.min.y;
    if (
      lastCenterWorldYRef.current !== null
      && Math.abs(centerWorldY - lastCenterWorldYRef.current) < 1e-7
    ) return;
    lastCenterWorldYRef.current = centerWorldY;
    camera.position.y = centerWorldY;
    controls.target.y = centerWorldY;
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  });

  return null;
};

const HoseHandleProbe = ({
  onChange,
}: {
  onChange: (bounds: HoseHandleBounds) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const lastKeyRef = useRef('');

  useFrame(() => {
    const connectedTarget = scene.getObjectByName(
      PISTON_MODEL_HIT_TARGETS.connectedHoseHandle.objectName,
    );
    const detachedTarget = scene.getObjectByName(
      PISTON_MODEL_HIT_TARGETS.detachedHoseHandle.objectName,
    );
    if (!connectedTarget || !detachedTarget) return;
    const projectBounds = (target: THREE.Object3D): ProjectedHoseHandleBounds | null => {
      target.updateWorldMatrix(true, true);
      const projectedPoints: THREE.Vector3[] = [];
      target.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (object.name.includes('_Segment_')) {
          projectedPoints.push(
            new THREE.Vector3(0, 0, -0.5).applyMatrix4(object.matrixWorld).project(camera),
            new THREE.Vector3(0, 0, 0.5).applyMatrix4(object.matrixWorld).project(camera),
          );
          return;
        }
        projectedPoints.push(object.getWorldPosition(new THREE.Vector3()).project(camera));
      });
      if (projectedPoints.length === 0) return null;
      let left = Number.POSITIVE_INFINITY;
      let top = Number.NEGATIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let bottom = Number.POSITIVE_INFINITY;
      for (const point of projectedPoints) {
        left = Math.min(left, point.x);
        top = Math.max(top, point.y);
        right = Math.max(right, point.x);
        bottom = Math.min(bottom, point.y);
      }
      const paddingNdc = 0.055;
      return {
        left: THREE.MathUtils.clamp(left - paddingNdc, -0.98, 0.98),
        top: THREE.MathUtils.clamp(top + paddingNdc, -0.98, 0.98),
        right: THREE.MathUtils.clamp(right + paddingNdc, -0.98, 0.98),
        bottom: THREE.MathUtils.clamp(bottom - paddingNdc, -0.98, 0.98),
      };
    };
    const connected = projectBounds(connectedTarget);
    const detached = projectBounds(detachedTarget);
    if (!connected || !detached) return;
    const key = [
      connected.left,
      connected.top,
      connected.right,
      connected.bottom,
      detached.left,
      detached.top,
      detached.right,
      detached.bottom,
    ]
      .map((value) => value.toFixed(5))
      .join(':');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onChange({ connected, detached });
  });

  return null;
};

const PowerButtonProbe = ({
  onChange,
}: {
  onChange: (bounds: ProjectedPowerButtonBounds) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const lastKeyRef = useRef('');

  useFrame(() => {
    const target = scene.getObjectByName(
      PISTON_MODEL_HIT_TARGETS.universalInterfacePowerButton.objectName,
    );
    if (!target) return;
    target.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(target, true);
    if (bounds.isEmpty()) return;
    const projected = [
      [bounds.min.x, bounds.min.y, bounds.min.z],
      [bounds.min.x, bounds.min.y, bounds.max.z],
      [bounds.min.x, bounds.max.y, bounds.min.z],
      [bounds.min.x, bounds.max.y, bounds.max.z],
      [bounds.max.x, bounds.min.y, bounds.min.z],
      [bounds.max.x, bounds.min.y, bounds.max.z],
      [bounds.max.x, bounds.max.y, bounds.min.z],
      [bounds.max.x, bounds.max.y, bounds.max.z],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z).project(camera));
    const next = {
      left: Math.min(...projected.map((point) => point.x)),
      top: Math.max(...projected.map((point) => point.y)),
      right: Math.max(...projected.map((point) => point.x)),
      bottom: Math.min(...projected.map((point) => point.y)),
    };
    const key = [next.left, next.top, next.right, next.bottom]
      .map((value) => value.toFixed(5))
      .join(':');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onChange(next);
  });

  return null;
};

const PistonPlatformProbe = ({
  onChange,
}: {
  onChange: (point: readonly [number, number]) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const lastKeyRef = useRef('');

  useFrame(() => {
    const massPlatform = scene.getObjectByName('MassPlatform');
    if (!massPlatform) return;
    const center = new THREE.Box3()
      .setFromObject(massPlatform, true)
      .getCenter(new THREE.Vector3())
      .project(camera);
    const key = `${center.x.toFixed(5)}:${center.y.toFixed(5)}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onChange([center.x, center.y]);
  });

  return null;
};

const PistonLockingScrewProbe = ({
  onChange,
}: {
  onChange: (point: readonly [number, number]) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const lastKeyRef = useRef('');

  useFrame(() => {
    const screw = scene.getObjectByName('PistonLockingScrew_KnurledKnob');
    if (!screw) return;
    const center = new THREE.Box3()
      .setFromObject(screw, true)
      .getCenter(new THREE.Vector3())
      .project(camera);
    const key = `${center.x.toFixed(5)}:${center.y.toFixed(5)}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onChange([center.x, center.y]);
  });

  return null;
};

const PistonPlatformClearanceProbe = ({
  onChange,
}: {
  onChange: (clearanceMm: number) => void;
}) => {
  const scene = useThree((state) => state.scene);
  const lastValueRef = useRef<number | null>(null);

  useFrame(() => {
    const massPlatform = scene.getObjectByName('MassPlatform');
    const topSlab = scene.getObjectByName('ProtectiveFrame_TopSlab');
    if (!massPlatform || !topSlab) return;
    const platformBounds = new THREE.Box3().setFromObject(massPlatform, true);
    const topSlabBounds = new THREE.Box3().setFromObject(topSlab, true);
    if (platformBounds.isEmpty() || topSlabBounds.isEmpty()) return;
    const clearanceMm = (platformBounds.min.y - topSlabBounds.max.y) * 1000;
    if (
      lastValueRef.current !== null
      && Math.abs(clearanceMm - lastValueRef.current) < 0.001
    ) return;
    lastValueRef.current = clearanceMm;
    onChange(clearanceMm);
  });

  return null;
};

const mapPistonDragToOffsetMm = (dragDistancePx: number) => {
  const normalized = THREE.MathUtils.clamp(
    dragDistancePx / PISTON_PRESS_DRAG_RANGE_PX,
    0,
    1,
  );
  const resistanceCurve = (1 - Math.exp(-2.35 * normalized)) / (1 - Math.exp(-2.35));
  return -PISTON_PRESS_DEFAULT_MAX_OFFSET_MM * resistanceCurve;
};

const PistonPlatformControl = ({
  enabled,
  platformMode,
  spaceHeld,
  offsetMm,
  equilibriumHeightMm,
  guideSnapTargetHeightMm,
  onMouseHeldChange,
  onOffsetChange,
  onEquilibriumHeightChange,
  onHoverChange,
  onActionAttempt,
  releaseFrozen,
}: {
  enabled: boolean;
  platformMode: PistonPlatformMode;
  spaceHeld: boolean;
  offsetMm: number;
  equilibriumHeightMm: number;
  guideSnapTargetHeightMm: number | null;
  onMouseHeldChange: (held: boolean, releasedAtMs?: number) => void;
  onOffsetChange: (offsetMm: number) => void;
  onEquilibriumHeightChange: (heightMm: number) => void;
  onHoverChange: (hovered: boolean) => void;
  onActionAttempt: (action: 'platformGrab' | 'platformMove' | 'platformRelease') => boolean;
  releaseFrozen: boolean;
}) => {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const hitTargetRef = useRef<THREE.Mesh>(null);
  const platformBoundsRef = useRef(new THREE.Box3());
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startClientY: 0,
    startOffsetMm: 0,
    startEquilibriumHeightMm: PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
    movementRejected: false,
    movementAuthorized: false,
    heightSnapped: false,
  });

  useEffect(() => {
    if (!dragRef.current.active || dragRef.current.movementAuthorized) return;
    dragRef.current.movementRejected = false;
  }, [platformMode, spaceHeld]);

  const finishPointer = useCallback((event?: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event) {
      const target = event.target as EventTarget & {
        hasPointerCapture?: (pointerId: number) => boolean;
        releasePointerCapture?: (pointerId: number) => void;
      };
      if (target.hasPointerCapture?.(dragRef.current.pointerId)) {
        target.releasePointerCapture?.(dragRef.current.pointerId);
      }
    }
    gl.domElement.style.cursor = event ? 'grab' : '';
    if (!releaseFrozen) onActionAttempt('platformRelease');
    onMouseHeldChange(false, performance.now());
    if (!event) onHoverChange(false);
  }, [gl.domElement.style, onActionAttempt, onHoverChange, onMouseHeldChange, releaseFrozen]);

  useEffect(() => {
    const handleWindowBlur = () => finishPointer();
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [finishPointer]);

  useEffect(() => {
    if (!enabled) finishPointer();
  }, [enabled, finishPointer]);

  useFrame(() => {
    const hitTarget = hitTargetRef.current;
    const massPlatform = scene.getObjectByName('MassPlatform');
    if (!hitTarget || !massPlatform) return;
    platformBoundsRef.current.setFromObject(massPlatform, true);
    if (platformBoundsRef.current.isEmpty()) return;
    const center = platformBoundsRef.current.getCenter(new THREE.Vector3());
    const size = platformBoundsRef.current.getSize(new THREE.Vector3());
    hitTarget.position.copy(center);
    hitTarget.scale.set(size.x + 0.014, size.y + 0.008, size.z + 0.014);
    hitTarget.visible = enabled;
  });

  useLayoutEffect(() => () => {
    gl.domElement.style.cursor = '';
  }, [gl.domElement.style]);

  return (
    <mesh
      ref={hitTargetRef}
      name="HIT_PistonPlatform_InteractionWorkspace"
      visible={enabled}
      userData={{
        hitTargetId: 'piston_platform_focus_preview',
        semanticRole: platformMode === 'adjustHeight'
          ? 'adjust_piston_height_with_mouse_hand'
          : 'press_piston_with_mouse_hand',
        gesture: platformMode === 'adjustHeight'
          ? 'single_hand_vertical_height_drag'
          : 'space_plus_vertical_press_drag',
      }}
      onPointerOver={(event) => {
        if (!enabled) return;
        event.stopPropagation();
        gl.domElement.style.cursor = dragRef.current.active ? 'grabbing' : 'grab';
        onHoverChange(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (dragRef.current.active) return;
        gl.domElement.style.cursor = '';
        onHoverChange(false);
      }}
      onPointerDown={(event) => {
        if (!enabled || event.button !== 0) return;
        event.stopPropagation();
        if (!onActionAttempt('platformGrab')) return;
        const target = event.target as EventTarget & {
          setPointerCapture: (pointerId: number) => void;
        };
        target.setPointerCapture(event.pointerId);
        dragRef.current = {
          active: true,
          pointerId: event.pointerId,
          startClientY: event.nativeEvent.clientY,
          startOffsetMm: offsetMm,
          startEquilibriumHeightMm: equilibriumHeightMm,
          movementRejected: false,
          movementAuthorized: false,
          heightSnapped: resolvePistonOscillationGuideHeightSnap(
            equilibriumHeightMm,
            guideSnapTargetHeightMm,
            false,
          ).snapped,
        };
        gl.domElement.style.cursor = 'grabbing';
        onHoverChange(true);
        onMouseHeldChange(true);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current.active || event.pointerId !== dragRef.current.pointerId) return;
        event.stopPropagation();
        if (dragRef.current.movementRejected) return;
        if (!dragRef.current.movementAuthorized && !onActionAttempt('platformMove')) {
          dragRef.current.movementRejected = true;
          return;
        }
        dragRef.current.movementAuthorized = true;
        if (!spaceHeld && platformMode !== 'adjustHeight') return;
        const signedDragDistancePx = event.nativeEvent.clientY - dragRef.current.startClientY;
        if (platformMode === 'adjustHeight') {
          const rawHeightMm = clampPistonEquilibriumHeightMm(
            dragRef.current.startEquilibriumHeightMm
              - signedDragDistancePx * PISTON_HEIGHT_DRAG_MM_PER_PX,
          );
          const snap = resolvePistonOscillationGuideHeightSnap(
            rawHeightMm,
            guideSnapTargetHeightMm,
            dragRef.current.heightSnapped,
          );
          dragRef.current.heightSnapped = snap.snapped;
          onEquilibriumHeightChange(snap.heightMm);
          return;
        }
        if (platformMode === 'screwLocked') return;
        const dragDistancePx = Math.max(
          0,
          signedDragDistancePx,
        );
        onOffsetChange(Math.min(
          dragRef.current.startOffsetMm,
          mapPistonDragToOffsetMm(dragDistancePx),
        ));
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        finishPointer(event);
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        finishPointer(event);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const normalizeAngleDelta = (delta: number) => {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
};

const OperationMirrorScrewControl = ({
  progress,
  onProgressDelta,
  onHoverChange,
  onDraggingChange,
  onHitPointReady,
}: {
  progress: number;
  onProgressDelta: (progressDelta: number) => void;
  onHoverChange: (hovered: boolean) => void;
  onDraggingChange: (dragging: boolean) => void;
  onHitPointReady: (point: readonly [number, number]) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const hitTargetRef = useRef<THREE.Mesh>(null);
  const screwCenterWorldRef = useRef(new THREE.Vector3());
  const screwBoundsRef = useRef(new THREE.Box3());
  const reportedHitPointRef = useRef('');
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    lastAngle: 0,
  });

  const getPointerAngle = useCallback((event: ThreeEvent<PointerEvent>) => {
    const projectedCenter = screwCenterWorldRef.current.clone().project(camera);
    return Math.atan2(
      event.pointer.y - projectedCenter.y,
      event.pointer.x - projectedCenter.x,
    );
  }, [camera]);

  const finishDrag = useCallback((event?: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event) {
      const target = event.target as EventTarget & {
        hasPointerCapture?: (pointerId: number) => boolean;
        releasePointerCapture?: (pointerId: number) => void;
      };
      if (target.hasPointerCapture?.(dragRef.current.pointerId)) {
        target.releasePointerCapture?.(dragRef.current.pointerId);
      }
    }
    gl.domElement.style.cursor = event ? 'grab' : '';
    if (!event) onHoverChange(false);
    onDraggingChange(false);
  }, [gl.domElement.style, onDraggingChange, onHoverChange]);

  useEffect(() => {
    const handleWindowBlur = () => finishDrag();
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [finishDrag]);

  useFrame(() => {
    const hitTarget = hitTargetRef.current;
    const screwKnob = scene.getObjectByName('PistonLockingScrew_KnurledKnob');
    if (!hitTarget || !screwKnob) return;
    screwBoundsRef.current.setFromObject(screwKnob, true);
    if (screwBoundsRef.current.isEmpty()) return;
    screwBoundsRef.current.getCenter(screwCenterWorldRef.current);
    hitTarget.position.copy(screwCenterWorldRef.current);
    const projectedCenter = screwCenterWorldRef.current.clone().project(camera);
    const hitPointKey = `${projectedCenter.x.toFixed(4)}:${projectedCenter.y.toFixed(4)}`;
    if (reportedHitPointRef.current !== hitPointKey) {
      reportedHitPointRef.current = hitPointKey;
      onHitPointReady([projectedCenter.x, projectedCenter.y]);
    }
  });

  useLayoutEffect(() => () => {
    gl.domElement.style.cursor = '';
  }, [gl.domElement.style]);

  return (
    <mesh
      ref={hitTargetRef}
      name="HIT_PistonLockingScrew_OperationMirror"
      userData={{
        hitTargetId: 'piston_locking_screw_operation_mirror',
        semanticRole: 'tighten_or_loosen',
        gesture: 'circular_drag',
        progress,
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        gl.domElement.style.cursor = dragRef.current.active ? 'grabbing' : 'grab';
        onHoverChange(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (dragRef.current.active) return;
        gl.domElement.style.cursor = '';
        onHoverChange(false);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const target = event.target as EventTarget & {
          setPointerCapture: (pointerId: number) => void;
        };
        target.setPointerCapture(event.pointerId);
        dragRef.current = {
          active: true,
          pointerId: event.pointerId,
          lastAngle: getPointerAngle(event),
        };
        gl.domElement.style.cursor = 'grabbing';
        onHoverChange(true);
        onDraggingChange(true);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current.active || event.pointerId !== dragRef.current.pointerId) return;
        event.stopPropagation();
        const nextAngle = getPointerAngle(event);
        const delta = normalizeAngleDelta(nextAngle - dragRef.current.lastAngle);
        dragRef.current.lastAngle = nextAngle;
        const progressDelta = -delta /
          (Math.PI * 2 * PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS);
        onProgressDelta(progressDelta);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        finishDrag(event);
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        finishDrag(event);
      }}
    >
      <boxGeometry args={[0.026, 0.03, 0.026]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const PistonOscillationSceneLighting = ({
  sceneTheme = 'light',
  scaleReadingDetail = false,
}: {
  sceneTheme?: 'light' | 'dark';
  scaleReadingDetail?: boolean;
}) => (
  <>
    <color attach="background" args={[sceneTheme === 'light' ? '#dce4e8' : '#20282e']} />
    <hemisphereLight
      color={sceneTheme === 'light' ? '#ffffff' : '#f8fbff'}
      groundColor={sceneTheme === 'light' ? '#53636d' : '#182128'}
      intensity={sceneTheme === 'light' ? 0.42 : 0.34}
    />
    <directionalLight
      color={sceneTheme === 'light' ? '#fffaf3' : '#f4f7fb'}
      intensity={sceneTheme === 'light' ? 2.35 : 2.1}
      position={[-0.72, 2.75, 1.35]}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-0.45}
      shadow-camera-right={0.45}
      shadow-camera-top={0.65}
      shadow-camera-bottom={-0.18}
      shadow-camera-near={0.1}
      shadow-camera-far={5}
      shadow-bias={-0.00015}
      shadow-normalBias={0.002}
    />
    <directionalLight
      color={sceneTheme === 'light' ? '#cfe4f3' : '#b6d3e8'}
      intensity={sceneTheme === 'light' ? 0.48 : 0.38}
      position={[1.45, 1.55, 0.45]}
    />
    <directionalLight
      color={sceneTheme === 'light' ? '#b8d9ec' : '#8fbcd8'}
      intensity={scaleReadingDetail ? 0.3 : sceneTheme === 'light' ? 0.72 : 0.58}
      position={[0.65, 1.75, -2.1]}
    />
    {scaleReadingDetail ? (
      <>
        <directionalLight
          color="#eaf4f8"
          intensity={0.56}
          position={[0.2, 0.5, 0.65]}
        />
        <directionalLight
          color="#8fb9ca"
          intensity={0.28}
          position={[-0.25, 0.32, 0.18]}
        />
        <directionalLight
          color="#a9d9ea"
          intensity={0.48}
          position={[0.2, -0.45, 0.65]}
        />
      </>
    ) : null}
  </>
);

const OperationMirrorFrameReadyBridge = ({
  view,
  onFrameReady,
}: {
  view: PistonOscillationOperationMirrorView;
  onFrameReady: (view: PistonOscillationOperationMirrorView) => void;
}) => {
  const reportedViewRef = useRef<PistonOscillationOperationMirrorView | null>(null);

  useFrame(() => {
    if (reportedViewRef.current === view) return;
    reportedViewRef.current = view;
    onFrameReady(view);
  });

  return null;
};

const PistonOscillationSceneModel = ({
  powerOn = false,
  powerPressProgress = 0,
  powerInteractionEnabled = false,
  hoseState,
  hoseInteractionEnabled = false,
  hoseDragging = false,
  hoseWithinMagneticRange = false,
  hoseGhostOffset = [0, 0, 0],
  pistonEquilibriumHeightMm = PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
  pistonOscillationOffsetMm = 0,
  lockingScrewProgress,
  demoFocusTarget = null,
  demoFocusTheme = 'light',
  demoFocusPulseElapsedSeconds,
  demoHoseDragProgress = null,
  demoSnapGuideActive = false,
  demoSnapGuidePulseElapsedSeconds,
  scaleReadingVisualEnhancement = false,
  operationMirrorView,
  onOperationMirrorFrameReady,
  interactionEnabled = true,
  onBoundsReady,
  onPistonFocusRequest = () => undefined,
  onPowerPress = () => undefined,
  onHoseHoverChange = () => undefined,
  onHoseDragStart = () => undefined,
  onHoseDragChange = () => undefined,
  onHoseDragEnd = () => undefined,
}: {
  powerOn?: boolean;
  powerPressProgress?: number;
  powerInteractionEnabled?: boolean;
  hoseState: PistonOscillationHoseConnectionState;
  hoseInteractionEnabled?: boolean;
  hoseDragging?: boolean;
  hoseWithinMagneticRange?: boolean;
  hoseGhostOffset?: readonly [number, number, number];
  pistonEquilibriumHeightMm?: number;
  pistonOscillationOffsetMm?: number;
  lockingScrewProgress: number;
  demoFocusTarget?: PistonOscillationDemoFocusTarget;
  demoFocusTheme?: 'light' | 'dark';
  demoFocusPulseElapsedSeconds?: number;
  demoHoseDragProgress?: number | null;
  demoSnapGuideActive?: boolean;
  demoSnapGuidePulseElapsedSeconds?: number;
  scaleReadingVisualEnhancement?: boolean;
  operationMirrorView?: PistonOscillationOperationMirrorView;
  onOperationMirrorFrameReady?: (view: PistonOscillationOperationMirrorView) => void;
  interactionEnabled?: boolean;
  onBoundsReady: (bounds: PistonOscillationSceneBounds) => void;
  onPistonFocusRequest?: () => void;
  onPowerPress?: () => void;
  onHoseHoverChange?: (hovered: boolean) => void;
  onHoseDragStart?: () => boolean | void;
  onHoseDragChange?: (offset: THREE.Vector3, withinMagneticRange: boolean) => void;
  onHoseDragEnd?: (offset: THREE.Vector3, withinMagneticRange: boolean) => void;
}) => (
  <Suspense fallback={null}>
    <PistonOscillationInstrumentAsset>
      {(sourceScene) => (
        <>
          <PistonOscillationInteractiveModel
            sourceScene={sourceScene}
            powerOn={powerOn}
            powerPressProgress={powerPressProgress}
            powerInteractionEnabled={powerInteractionEnabled}
            pistonEquilibriumHeightMm={pistonEquilibriumHeightMm}
            pistonOscillationOffsetMm={pistonOscillationOffsetMm}
            lockingScrewProgress={lockingScrewProgress}
            hoseState={hoseState}
            hoseInteractionEnabled={hoseInteractionEnabled}
            hoseDragging={hoseDragging}
            hoseWithinMagneticRange={hoseWithinMagneticRange}
            hoseGhostOffset={hoseGhostOffset}
            demoFocusTarget={demoFocusTarget}
            demoFocusTheme={demoFocusTheme}
            demoFocusPulseElapsedSeconds={demoFocusPulseElapsedSeconds}
            demoHoseDragProgress={demoHoseDragProgress}
            demoSnapGuideActive={demoSnapGuideActive}
            demoSnapGuidePulseElapsedSeconds={demoSnapGuidePulseElapsedSeconds}
            scaleReadingVisualEnhancement={scaleReadingVisualEnhancement}
            interactionEnabled={interactionEnabled}
            onBoundsReady={onBoundsReady}
            onHoseFocusPointReady={() => undefined}
            onPistonFocusRequest={onPistonFocusRequest}
            onPowerPress={onPowerPress}
            onHoseHoverChange={onHoseHoverChange}
            onHoseDragStart={onHoseDragStart}
            onHoseDragChange={onHoseDragChange}
            onHoseDragEnd={onHoseDragEnd}
          />
          {operationMirrorView && onOperationMirrorFrameReady ? (
            <OperationMirrorFrameReadyBridge
              view={operationMirrorView}
              onFrameReady={onOperationMirrorFrameReady}
            />
          ) : null}
        </>
      )}
    </PistonOscillationInstrumentAsset>
  </Suspense>
);

const getInteractionHints = (
  mode: PistonOscillationFocusMode,
  hoseState: PistonOscillationHoseConnectionState,
  lockingScrewLocked: boolean,
  copy: ReturnType<typeof getPistonOscillationShellCopy>['interaction'],
) => {
  if (mode === 'pistonFocus') {
    if (lockingScrewLocked) return copy.lockedHints;
    if (hoseState === 'disconnected') return copy.disconnectedHints;
    return copy.connectedHints;
  }
  return copy.overviewHints;
};

export interface PistonOscillationInteractionWorkspaceProps {
  language?: PistonOscillationLanguage;
  powerOn?: boolean;
  onPowerToggle?: (powerOn: boolean) => void;
  sensorSampleRateHz?: number;
  initialMode?: PistonOscillationFocusMode;
  cameraPreset?: WorkbenchPistonOscillationCameraPreset;
  sceneTheme?: 'light' | 'dark';
  overviewRevision?: number;
  measurementCycleRevision?: number;
  guideSessionRevision?: number;
  onReleaseEvent?: (event: PistonOscillationReleaseEvent) => void;
  onLivePhysicalStateChange?: (
    state: PistonOscillationLivePhysicalState,
  ) => void;
  demoFrame?: PistonOscillationDemoFrame;
  demoPlaybackPhase?: 'idle' | 'running' | 'paused' | 'terminated' | 'completed';
  guidePaused?: boolean;
  guideTimeFrozen?: boolean;
  guideVisualCue?: PistonOscillationGuideVisualCue;
  guidePulseElapsedSeconds?: number;
  guideRequestedFocusMode?: PistonOscillationGuideFocusMode;
  guideSnapTargetHeightMm?: number | null;
  guideInitialInstrumentState?: PistonOscillationGuideInstrumentRestoreState | null;
  guideHeightReset?: PistonOscillationGuideHeightResetRequest | null;
  viewportWarningFeedbackId?: string | null;
  overlayTopRight?: ReactNode;
  overlayBelowDefaultView?: ReactNode;
  overlayCenter?: ReactNode;
  overlayCenterAboveGuideMask?: boolean;
  onGuideInstrumentSnapshotChange?: (
    snapshot: PistonOscillationGuideInstrumentSnapshot,
  ) => void;
  onGuideActionAttempt?: PistonOscillationGuideActionAttempt;
  onGuideHeightConfirmed?: (snapshot: PistonOscillationGuideInstrumentSnapshot) => void;
  onGuideSupportLoss?: (
    event: PistonOscillationGuideSupportLossEvent,
  ) => void;
  onGuideHeightResetComplete?: () => void;
  operationVisualizationEnabled?: boolean;
  onOperationVisualizationToggle?: () => void;
  showShiftOperationCue?: boolean;
  restoreDefaultViewLabel?: string;
  onRestoreDefaultView?: () => void;
}

export const PistonOscillationInteractionWorkspace = ({
  language = 'zh-CN',
  powerOn = false,
  onPowerToggle,
  sensorSampleRateHz,
  initialMode = 'pistonFocus',
  cameraPreset = 'overview',
  sceneTheme = 'light',
  overviewRevision = 0,
  measurementCycleRevision = 0,
  guideSessionRevision = 0,
  onReleaseEvent,
  onLivePhysicalStateChange,
  demoFrame,
  demoPlaybackPhase,
  guidePaused = false,
  guideTimeFrozen = false,
  guideVisualCue = null,
  guidePulseElapsedSeconds,
  guideRequestedFocusMode,
  guideSnapTargetHeightMm = null,
  guideInitialInstrumentState = null,
  guideHeightReset = null,
  viewportWarningFeedbackId = null,
  overlayTopRight,
  overlayBelowDefaultView,
  overlayCenter,
  overlayCenterAboveGuideMask = false,
  onGuideInstrumentSnapshotChange,
  onGuideActionAttempt,
  onGuideHeightConfirmed,
  onGuideSupportLoss,
  onGuideHeightResetComplete,
  operationVisualizationEnabled = false,
  onOperationVisualizationToggle,
  showShiftOperationCue = false,
  restoreDefaultViewLabel,
  onRestoreDefaultView,
}: PistonOscillationInteractionWorkspaceProps) => {
  const copy = getPistonOscillationShellCopy(language);
  const interactionCopy = copy.interaction;
  const demoPresentationCopy = copy.demoPresentation;
  const guideInteractionPaused = guidePaused || guideTimeFrozen;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const mirrorControlsRef = useRef<OrbitControlsImpl | null>(null);
  const handledOverviewRevisionRef = useRef(overviewRevision);
  const handledMeasurementCycleRevisionRef = useRef(measurementCycleRevision);
  const handledGuideSessionRevisionRef = useRef(guideSessionRevision);
  const [mode, setMode] = useState<PistonOscillationFocusMode>(
    guideInitialInstrumentState?.focusMode ?? initialMode,
  );
  const [bounds, setBounds] = useState<PistonOscillationSceneBounds | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);
  const initialGuideHeightMm = clampPistonEquilibriumHeightMm(
    guideInitialInstrumentState?.equilibriumHeightMm
      ?? PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
  );
  const initialGuideScrewProgress = Math.min(
    1,
    Math.max(0, guideInitialInstrumentState?.lockingScrewProgress ?? 0),
  );
  const [hoseState, setHoseState] = useState<PistonOscillationHoseConnectionState>(
    guideInitialInstrumentState?.hoseState ?? 'disconnected',
  );
  const [hoseDragging, setHoseDragging] = useState(false);
  const [hoseHovered, setHoseHovered] = useState(false);
  const [cameraGestureActive, setCameraGestureActive] = useState(false);
  const [hoseGhostOffset, setHoseGhostOffset] = useState<readonly [number, number, number]>(
    [0, 0, 0],
  );
  const [hoseWithinMagneticRange, setHoseWithinMagneticRange] = useState(false);
  const [hoseHandleBounds, setHoseHandleBounds] = useState<HoseHandleBounds | null>(null);
  const [powerButtonBounds, setPowerButtonBounds] =
    useState<ProjectedPowerButtonBounds | null>(null);
  const [manualPowerPressProgress, setManualPowerPressProgress] = useState(0);
  const [pistonPlatformPoint, setPistonPlatformPoint] = useState<
    readonly [number, number] | null
  >(null);
  const [lockingScrewPoint, setLockingScrewPoint] = useState<
    readonly [number, number] | null
  >(null);
  const [pistonPlatformClearanceMm, setPistonPlatformClearanceMm] = useState<
    number | null
  >(null);
  const [lockingScrewProgress, setLockingScrewProgress] = useState(
    initialGuideScrewProgress,
  );
  const [screwHovered, setScrewHovered] = useState(false);
  const [screwDragging, setScrewDragging] = useState(false);
  const [screwHitPoint, setScrewHitPoint] = useState<readonly [number, number] | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [mouseHeld, setMouseHeld] = useState(false);
  const [mouseVisualizationAction, setMouseVisualizationAction] =
    useState<PistonOscillationMouseAction | null>(null);
  const [shiftVisualizationActive, setShiftVisualizationActive] = useState(false);
  const [platformHovered, setPlatformHovered] = useState(false);
  const [pistonOffsetMm, setPistonOffsetMm] = useState(
    guideInitialInstrumentState?.pistonOffsetMm ?? 0,
  );
  const [pistonEquilibriumHeightMm, setPistonEquilibriumHeightMm] = useState(
    initialGuideHeightMm,
  );
  const [pistonPhase, setPistonPhase] = useState<PistonInteractionPhase>(
    guideInitialInstrumentState?.pistonPhase ?? 'idle',
  );
  const [heightAdjustmentStage, setHeightAdjustmentStage] =
    useState<PistonOscillationHeightAdjustmentStage>(
      guideInitialInstrumentState?.heightAdjustmentStage ?? 'readingHeight',
    );
  const [overviewFramingHeightMm, setOverviewFramingHeightMm] = useState(
    initialGuideHeightMm,
  );
  const [overviewPoseRevision, setOverviewPoseRevision] = useState(0);
  const [releaseGapMs, setReleaseGapMs] = useState<number | null>(null);
  const releaseEventIdRef = useRef(0);
  const lockingScrewProgressRef = useRef(initialGuideScrewProgress);
  const spaceHeldRef = useRef(false);
  const mouseHeldRef = useRef(false);
  const pistonOffsetMmRef = useRef(guideInitialInstrumentState?.pistonOffsetMm ?? 0);
  const pistonEquilibriumHeightMmRef = useRef(initialGuideHeightMm);
  const spaceReleasedAtRef = useRef<number | null>(null);
  const mouseReleasedAtRef = useRef<number | null>(null);
  const reboundAnimationFrameRef = useRef<number | null>(null);
  const unsupportedDropAnimationFrameRef = useRef<number | null>(null);
  const unsupportedDropVelocityMmPerSRef = useRef(0);
  const guideHeightResetAnimationFrameRef = useRef<number | null>(null);
  const guideHeightResetHandledRevisionRef = useRef<number | null>(null);
  const guideSupportLossReportedRef = useRef(false);
  const guideRejectedActionTimerRef = useRef<number | null>(null);
  const powerPressAnimationFrameRef = useRef<number | null>(null);
  const powerOnRef = useRef(powerOn);
  const hoseCameraClaimedRef = useRef(false);
  const hoseGuideSupportLostDuringDragRef = useRef(false);
  const [guideRejectedAction, setGuideRejectedAction] =
    useState<PistonOscillationGuideAction | null>(null);
  const heldInputInterruptedRef = useRef(false);
  const onGuideInstrumentSnapshotChangeRef = useRef(onGuideInstrumentSnapshotChange);
  const onGuideHeightResetCompleteRef = useRef(onGuideHeightResetComplete);
  const guidePausedRef = useRef(guideInteractionPaused);
  const guidePauseStartedAtMsRef = useRef<number | null>(null);
  const guideAccumulatedPauseMsRef = useRef(0);
  const screwDragStartProgressRef = useRef(0);
  const screwGuideGesturePendingDeltaRef = useRef(0);
  const screwGuideGestureAuthorizedActionRef =
    useRef<'tightenScrew' | 'loosenScrew' | null>(null);
  const screwGuideGestureRejectedRef = useRef(false);
  const demoActive = demoFrame !== undefined;
  const effectiveDemoPlaybackPhase = demoPlaybackPhase ?? (
    demoFrame?.completed ? 'completed' : demoFrame ? 'running' : 'idle'
  );
  const [displayedDemoFrame, setDisplayedDemoFrame] = useState(demoFrame);
  const [demoStepPanelMode, setDemoStepPanelMode] = useState<'hidden' | 'visible' | 'exiting'>(
    demoFrame ? 'visible' : 'hidden',
  );
  const [demoFeedbackMessage, setDemoFeedbackMessage] =
    useState<PromptViewportFeedbackMessage<'demo'> | null>(null);
  const [operationMirrorMode, setOperationMirrorMode] = useState<'hidden' | 'visible' | 'exiting'>(
    mode === 'pistonFocus' ? 'visible' : 'hidden',
  );
  const [operationMirrorViewOverride, setOperationMirrorViewOverride] = useState<{
    view: PistonOscillationOperationMirrorView;
    automaticView: PistonOscillationOperationMirrorView;
  } | null>(null);
  const [viewportWarningShakeRevision, setViewportWarningShakeRevision] = useState(0);
  const handledViewportWarningFeedbackIdRef = useRef<string | null>(null);
  const [operationMirrorRenderedView, setOperationMirrorRenderedView] =
    useState<PistonOscillationOperationMirrorView | null>(null);
  const [operationMirrorModelReady, setOperationMirrorModelReady] = useState<
    Record<PistonOscillationOperationMirrorView, boolean>
  >({
    scaleReadingView: false,
    screwOperationView: false,
  });
  const overlayTopRightPresent = overlayTopRight !== undefined && overlayTopRight !== null;
  const [parentTopRightPanelMode, setParentTopRightPanelMode] = useState<
    'hidden' | 'visible' | 'exiting'
  >(overlayTopRightPresent ? 'visible' : 'hidden');
  const displayedDemoFrameRef = useRef(demoFrame);
  const displayedOverlayTopRightRef = useRef<ReactNode>(overlayTopRight ?? null);
  const demoStepPanelTimerRef = useRef<number | null>(null);
  const demoFeedbackTimerRef = useRef<number | null>(null);
  const operationMirrorTimerRef = useRef<number | null>(null);
  const shiftVisualizationTimerRef = useRef<number | null>(null);
  const parentTopRightPanelTimerRef = useRef<number | null>(null);
  const parentTopRightPanelMountedRef = useRef(overlayTopRightPresent);
  const operationMirrorWasVisibleRef = useRef(mode === 'pistonFocus');
  if (overlayTopRightPresent) displayedOverlayTopRightRef.current = overlayTopRight;

  useEffect(() => {
    powerOnRef.current = powerOn;
  }, [powerOn]);

  const attemptGuideAction = useCallback((
    action: PistonOscillationGuideAction,
    context: PistonOscillationGuideActionContext = {},
  ) => {
    if (!onGuideActionAttempt) return true;
    const result = onGuideActionAttempt(action, {
      heightMm: pistonEquilibriumHeightMmRef.current,
      leftHandSupporting: spaceHeldRef.current,
      rightHandSupporting: mouseHeldRef.current,
      ...context,
    });
    if (result.allowed) return true;
    if (guideRejectedActionTimerRef.current !== null) {
      window.clearTimeout(guideRejectedActionTimerRef.current);
    }
    setGuideRejectedAction(action);
    guideRejectedActionTimerRef.current = window.setTimeout(() => {
      guideRejectedActionTimerRef.current = null;
      setGuideRejectedAction(null);
    }, 520);
    return false;
  }, [onGuideActionAttempt]);
  const requestPowerPress = useCallback(() => {
    if (powerPressAnimationFrameRef.current !== null) return;
    const powerToggleAllowed = attemptGuideAction('togglePower');
    const startedAtMs = performance.now();
    let toggleCommitted = false;
    const animate = (nowMs: number) => {
      const elapsedMs = Math.max(0, nowMs - startedAtMs);
      const nextProgress = elapsedMs <= 105
        ? elapsedMs / 105
        : elapsedMs <= 165
          ? 1
          : Math.max(0, 1 - ((elapsedMs - 165) / 145));
      setManualPowerPressProgress(nextProgress);
      if (!toggleCommitted && elapsedMs >= 165) {
        toggleCommitted = true;
        if (powerToggleAllowed) onPowerToggle?.(!powerOnRef.current);
      }
      if (elapsedMs < 310) {
        powerPressAnimationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }
      powerPressAnimationFrameRef.current = null;
      setManualPowerPressProgress(0);
    };
    powerPressAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [attemptGuideAction, onPowerToggle]);
  useEffect(() => () => {
    if (powerPressAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(powerPressAnimationFrameRef.current);
      powerPressAnimationFrameRef.current = null;
    }
  }, []);
  const effectiveParentTopRightPanelMode = overlayTopRightPresent
    && parentTopRightPanelMode === 'hidden'
    ? 'visible'
    : parentTopRightPanelMode;
  const focusActive = mode !== 'overview';
  const lockingScrewClampState = getPistonLockingScrewClampState(lockingScrewProgress);
  const lockingScrewLocked = lockingScrewClampState === 'locked';
  const platformMode: PistonPlatformMode = lockingScrewLocked
    ? 'screwLocked'
    : hoseState === 'disconnected'
      ? 'adjustHeight'
      : 'press';
  const formalHeightAdjustmentActive = !demoActive
    && mode === 'pistonFocus'
    && hoseState === 'disconnected';
  const heightFollowingActive = formalHeightAdjustmentActive;
  const formalHeightAdjustmentPose = useMemo(
    () => formalHeightAdjustmentActive
      ? getPistonHeightAdjustmentCameraDefinition(pistonEquilibriumHeightMm)
      : undefined,
    [formalHeightAdjustmentActive, pistonEquilibriumHeightMm],
  );
  const adaptiveOverviewPose = useMemo(() => (
    mode === 'overview' && bounds
      ? offsetPistonOscillationOverviewPoseForHeight(
        createOverviewPose(bounds, cameraPreset),
        overviewFramingHeightMm,
      )
      : undefined
  ), [bounds, cameraPreset, mode, overviewFramingHeightMm]);
  const mainPoseOverride = formalHeightAdjustmentPose
    ?? adaptiveOverviewPose;
  const automaticOperationMirrorView = getPistonOscillationAutomaticOperationMirrorView({
    hoseConnected: hoseState === 'connected',
    lockingScrewLocked,
    screwDragging,
    heightAdjustmentStage,
  });
  const currentOperationMirrorViewOverride =
    operationMirrorViewOverride?.automaticView === automaticOperationMirrorView
      ? operationMirrorViewOverride.view
      : null;
  const operationMirrorView: PistonOscillationOperationMirrorView =
    demoFrame?.operationMirrorView
      ?? currentOperationMirrorViewOverride
      ?? automaticOperationMirrorView;
  const scaleReadingOperationMirrorActive = operationMirrorView === 'scaleReadingView';
  const screwOperationMirrorActive = operationMirrorView === 'screwOperationView';
  const operationMirrorScrewPose = PISTON_OSCILLATION_CONFIRMED_FOCUS_CAMERAS.screwOperationView;
  const operationMirrorScalePose = PISTON_OSCILLATION_SCALE_READING_SUGGESTED_CAMERA;
  const operationMirrorModelsReady = operationMirrorModelReady.scaleReadingView
    && operationMirrorModelReady.screwOperationView;
  const operationMirrorInitialFrameReady = operationMirrorModelsReady
    && operationMirrorRenderedView !== null;
  const operationMirrorViewReady = operationMirrorModelsReady
    && operationMirrorRenderedView === operationMirrorView;
  const handleOperationMirrorModelReady = useCallback((view: PistonOscillationOperationMirrorView) => {
    setOperationMirrorModelReady((current) => (
      current[view] ? current : { ...current, [view]: true }
    ));
  }, []);
  const operationMirrorMotionClass = !operationMirrorInitialFrameReady
    ? 'is-preparing'
    : operationMirrorMode === 'exiting'
      ? 'is-exiting'
      : operationMirrorMode === 'visible'
        ? 'is-visible'
        : 'is-hidden';
  const heightStageActionVisible = !demoActive
    && mode === 'pistonFocus'
    && platformMode === 'adjustHeight';
  const heightStageActionEnabled = heightStageActionVisible
    && !guideInteractionPaused
    && (onGuideActionAttempt ? true : spaceHeld && !mouseHeld)
    && !hoseDragging
    && !screwDragging
    && !transitionActive;
  const hints = getInteractionHints(mode, hoseState, lockingScrewLocked, interactionCopy);
  const lockingScrewStatus = lockingScrewLocked
    ? interactionCopy.lockedStatus
    : interactionCopy.looseStatus;
  const demoHighlightControls = demoFrame?.highlightControls
    ?? (demoFrame?.highlightControl ? [demoFrame.highlightControl] : []);
  const effectivePowerOn = demoFrame?.powerOn ?? powerOn;
  const effectivePowerPressProgress = demoFrame?.powerButtonPressProgress
    ?? manualPowerPressProgress;
  const demoMainFocusTarget: PistonOscillationDemoFocusTarget =
    demoHighlightControls.includes('power')
      ? 'power'
      : demoHighlightControls.includes('platform')
      ? 'platform'
      : demoHighlightControls.includes('hose')
        ? 'hose'
        : null;
  const demoMirrorFocusTarget: PistonOscillationDemoFocusTarget =
    demoHighlightControls.includes('screw') ? 'screw' : null;
  const guideFocusTarget: PistonOscillationDemoFocusTarget =
    guideVisualCue === 'power'
      ? 'power'
      : guideVisualCue === 'platform'
    || guideVisualCue === 'screw'
      ? guideVisualCue
      : guideVisualCue === 'hoseDisconnect' || guideVisualCue === 'hoseReconnect'
        ? 'hose'
      : null;
  const effectiveOperationCue = useMemo<PistonOscillationOperationCue | null>(() => {
    if (!operationVisualizationEnabled) return null;
    if (demoFrame) return demoFrame.operationCue;
    if (showShiftOperationCue && shiftVisualizationActive) return { keys: ['shift'] };
    const keys: PistonOscillationOperationCue['keys'][number][] = [];
    if (spaceHeld) keys.push('space');
    if (mouseHeld || screwDragging || hoseDragging) keys.push('mouseLeft');
    if (keys.length === 0) return null;
    return {
      keys,
      mouseAction: keys.includes('mouseLeft')
        ? mouseVisualizationAction ?? 'click'
        : undefined,
    };
  }, [
    demoFrame,
    hoseDragging,
    mouseHeld,
    mouseVisualizationAction,
    operationVisualizationEnabled,
    screwDragging,
    showShiftOperationCue,
    shiftVisualizationActive,
    spaceHeld,
  ]);
  const effectiveMainFocusTarget = demoMainFocusTarget
    ?? (guideFocusTarget === 'power'
      || guideFocusTarget === 'platform'
      || guideFocusTarget === 'hose'
      ? guideFocusTarget
      : null);
  const effectiveMirrorFocusTarget = demoMirrorFocusTarget
    ?? (guideFocusTarget === 'screw' ? 'screw' : null);
  const effectiveFocusPulseElapsedSeconds = demoFrame?.highlightElapsedSeconds
    ?? guidePulseElapsedSeconds;
  const demoHoseDragProgress = demoFrame?.activeControl === 'hose'
    ? demoFrame.hoseGhostProgress
    : null;
  const demoSnapGuideActive = demoHighlightControls.includes('hoseSnap')
    || guideVisualCue === 'hoseSnap'
    || guideVisualCue === 'hoseReconnect';
  const enterOverview = useCallback(() => {
    setOverviewFramingHeightMm(pistonEquilibriumHeightMmRef.current);
    setOverviewPoseRevision((current) => current + 1);
    setMode('overview');
  }, []);

  const abortHeldInputs = useCallback(() => {
    heldInputInterruptedRef.current = true;
    spaceHeldRef.current = false;
    mouseHeldRef.current = false;
    spaceReleasedAtRef.current = null;
    mouseReleasedAtRef.current = null;
    setSpaceHeld(false);
    setMouseHeld(false);
    setPlatformHovered(false);
    setPistonPhase((current) => (
      current === 'rebounding' || current === 'falling' ? current : 'idle'
    ));
  }, []);

  useEffect(() => {
    onGuideInstrumentSnapshotChangeRef.current = onGuideInstrumentSnapshotChange;
  }, [onGuideInstrumentSnapshotChange]);
  useEffect(() => {
    onGuideHeightResetCompleteRef.current = onGuideHeightResetComplete;
  }, [onGuideHeightResetComplete]);
  useEffect(() => {
    const nowMs = performance.now();
    if (guideInteractionPaused) {
      guidePausedRef.current = true;
      guidePauseStartedAtMsRef.current ??= nowMs;
      return;
    }
    if (guidePauseStartedAtMsRef.current !== null) {
      guideAccumulatedPauseMsRef.current += nowMs - guidePauseStartedAtMsRef.current;
      guidePauseStartedAtMsRef.current = null;
    }
    guidePausedRef.current = false;
  }, [guideInteractionPaused]);
  useEffect(() => {
    if (!guideInteractionPaused) return;
    screwGuideGestureAuthorizedActionRef.current = null;
    screwGuideGesturePendingDeltaRef.current = 0;
    screwGuideGestureRejectedRef.current = false;
    setScrewDragging(false);
  }, [guideInteractionPaused]);
  useEffect(() => {
    if (!guidePaused) return;
    abortHeldInputs();
    hoseCameraClaimedRef.current = false;
    if (controlsRef.current) controlsRef.current.enableRotate = true;
    setScrewHovered(false);
    setScrewDragging(false);
    setHoseHovered(false);
    setHoseDragging(false);
  }, [abortHeldInputs, guidePaused]);
  useEffect(() => {
    onGuideInstrumentSnapshotChangeRef.current?.({
      focusMode: mode,
      hoseState,
      hoseDragging,
      equilibriumHeightMm: pistonEquilibriumHeightMm,
      pistonOffsetMm,
      lockingScrewProgress,
      lockingScrewState: lockingScrewClampState,
      heightAdjustmentStage,
      spaceHeld,
      mouseHeld,
      pistonPhase,
    });
  }, [
    heightAdjustmentStage,
    hoseState,
    hoseDragging,
    lockingScrewClampState,
    lockingScrewProgress,
    mode,
    mouseHeld,
    pistonEquilibriumHeightMm,
    pistonOffsetMm,
    pistonPhase,
    spaceHeld,
  ]);

  useEffect(() => {
    onLivePhysicalStateChange?.({
      observedAtMs: performance.now(),
      equilibriumHeightMm: pistonEquilibriumHeightMm,
      displacementMm: pistonOffsetMm,
    });
  }, [
    onLivePhysicalStateChange,
    pistonEquilibriumHeightMm,
    pistonOffsetMm,
  ]);

  useEffect(() => {
    if (!guideRequestedFocusMode || demoActive) return;
    if (guideRequestedFocusMode === 'overview') {
      enterOverview();
      return;
    }
    setMode(guideRequestedFocusMode);
  }, [
    demoActive,
    enterOverview,
    guideRequestedFocusMode,
  ]);
  useEffect(() => {
    if (!demoFrame) return;
    displayedDemoFrameRef.current = demoFrame;
    setDisplayedDemoFrame(demoFrame);
  }, [demoFrame]);
  useEffect(() => {
    if (parentTopRightPanelTimerRef.current !== null) {
      window.clearTimeout(parentTopRightPanelTimerRef.current);
      parentTopRightPanelTimerRef.current = null;
    }
    if (overlayTopRightPresent) {
      parentTopRightPanelMountedRef.current = true;
      setParentTopRightPanelMode('visible');
      return undefined;
    }
    if (!parentTopRightPanelMountedRef.current) {
      setParentTopRightPanelMode('hidden');
      return undefined;
    }
    setParentTopRightPanelMode('exiting');
    parentTopRightPanelTimerRef.current = window.setTimeout(() => {
      parentTopRightPanelMountedRef.current = false;
      displayedOverlayTopRightRef.current = null;
      setParentTopRightPanelMode('hidden');
      parentTopRightPanelTimerRef.current = null;
    }, 1_290);
    return () => {
      if (parentTopRightPanelTimerRef.current !== null) {
        window.clearTimeout(parentTopRightPanelTimerRef.current);
        parentTopRightPanelTimerRef.current = null;
      }
    };
  }, [overlayTopRightPresent]);
  useEffect(() => {
    if (demoStepPanelTimerRef.current !== null) {
      window.clearTimeout(demoStepPanelTimerRef.current);
      demoStepPanelTimerRef.current = null;
    }
    if (
      (effectiveDemoPlaybackPhase === 'running'
        || effectiveDemoPlaybackPhase === 'paused')
      && demoFrame
    ) {
      setDemoStepPanelMode('visible');
      return undefined;
    }
    if (!demoFrame && !displayedDemoFrameRef.current) {
      setDemoStepPanelMode('hidden');
      return undefined;
    }
    setDemoStepPanelMode('exiting');
    demoStepPanelTimerRef.current = window.setTimeout(() => {
      setDemoStepPanelMode('hidden');
      setDisplayedDemoFrame(undefined);
      displayedDemoFrameRef.current = undefined;
      demoStepPanelTimerRef.current = null;
    }, 560);
    return () => {
      if (demoStepPanelTimerRef.current !== null) {
        window.clearTimeout(demoStepPanelTimerRef.current);
        demoStepPanelTimerRef.current = null;
      }
    };
  }, [demoFrame !== undefined, effectiveDemoPlaybackPhase]);
  useEffect(() => {
    if (demoFeedbackTimerRef.current !== null) {
      window.clearTimeout(demoFeedbackTimerRef.current);
      demoFeedbackTimerRef.current = null;
    }
    const nextMessage = effectiveDemoPlaybackPhase === 'completed'
      ? createPromptViewportFeedbackMessage(
          demoPresentationCopy.completed,
          'success',
          { source: 'demo', durationMs: 3_000 },
        )
      : effectiveDemoPlaybackPhase === 'terminated'
        ? createPromptViewportFeedbackMessage(
            demoPresentationCopy.terminated,
            'warning',
            { source: 'demo', durationMs: 3_000 },
          )
        : null;
    if (nextMessage) enterOverview();
    setDemoFeedbackMessage(nextMessage);
    if (!nextMessage) return undefined;
    demoFeedbackTimerRef.current = window.setTimeout(() => {
      setDemoFeedbackMessage(null);
      demoFeedbackTimerRef.current = null;
    }, 3_000);
    return () => {
      if (demoFeedbackTimerRef.current !== null) {
        window.clearTimeout(demoFeedbackTimerRef.current);
        demoFeedbackTimerRef.current = null;
      }
    };
  }, [
    demoPresentationCopy.completed,
    demoPresentationCopy.terminated,
    effectiveDemoPlaybackPhase,
    enterOverview,
  ]);
  useEffect(() => {
    if (operationMirrorTimerRef.current !== null) {
      window.clearTimeout(operationMirrorTimerRef.current);
      operationMirrorTimerRef.current = null;
    }
    if (mode === 'pistonFocus') {
      operationMirrorWasVisibleRef.current = true;
      setOperationMirrorMode('visible');
      return undefined;
    }
    if (!operationMirrorWasVisibleRef.current) {
      setOperationMirrorMode('hidden');
      return undefined;
    }
    setOperationMirrorMode('exiting');
    operationMirrorTimerRef.current = window.setTimeout(() => {
      operationMirrorWasVisibleRef.current = false;
      setOperationMirrorMode('hidden');
      operationMirrorTimerRef.current = null;
    }, 160);
    return () => {
      if (operationMirrorTimerRef.current !== null) {
        window.clearTimeout(operationMirrorTimerRef.current);
        operationMirrorTimerRef.current = null;
      }
    };
  }, [mode]);
  useEffect(() => {
    if (handledMeasurementCycleRevisionRef.current === measurementCycleRevision) return;
    handledMeasurementCycleRevisionRef.current = measurementCycleRevision;
    setOperationMirrorViewOverride(null);
    setHeightAdjustmentStage('readingHeight');
  }, [measurementCycleRevision]);
  useEffect(() => {
    const nextWarningFeedbackId = viewportWarningFeedbackId
      ?? (
        demoFeedbackMessage?.kind === 'warning' || demoFeedbackMessage?.kind === 'danger'
          ? demoFeedbackMessage.id
          : null
      );
    if (nextWarningFeedbackId === null) {
      handledViewportWarningFeedbackIdRef.current = null;
      return;
    }
    if (handledViewportWarningFeedbackIdRef.current === nextWarningFeedbackId) return;
    handledViewportWarningFeedbackIdRef.current = nextWarningFeedbackId;
    setViewportWarningShakeRevision((current) => current + 1);
  }, [demoFeedbackMessage, viewportWarningFeedbackId]);
  useEffect(() => {
    if (screwOperationMirrorActive) return;
    setScrewHovered(false);
    setScrewDragging(false);
    setScrewHitPoint(null);
  }, [screwOperationMirrorActive]);
  useEffect(() => {
    if (
      demoActive
      || guideInteractionPaused
      || mode !== 'pistonFocus'
    ) return undefined;
    const handleOperationMirrorShortcut = (event: KeyboardEvent) => {
      if (
        event.key !== 'Shift'
        || event.repeat
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || isEditableKeyboardTarget(event.target)
        || mouseHeldRef.current
        || hoseDragging
        || screwDragging
      ) return;
      event.preventDefault();
      if (showShiftOperationCue) {
        setShiftVisualizationActive(true);
        if (shiftVisualizationTimerRef.current !== null) {
          window.clearTimeout(shiftVisualizationTimerRef.current);
        }
        shiftVisualizationTimerRef.current = window.setTimeout(() => {
          setShiftVisualizationActive(false);
          shiftVisualizationTimerRef.current = null;
        }, 220);
      }
      setOperationMirrorViewOverride({
        view: togglePistonOscillationOperationMirrorView(operationMirrorView),
        automaticView: automaticOperationMirrorView,
      });
    };
    window.addEventListener('keydown', handleOperationMirrorShortcut);
    return () => {
      window.removeEventListener('keydown', handleOperationMirrorShortcut);
      if (shiftVisualizationTimerRef.current !== null) {
        window.clearTimeout(shiftVisualizationTimerRef.current);
        shiftVisualizationTimerRef.current = null;
      }
      setShiftVisualizationActive(false);
    };
  }, [
    demoActive,
    guideInteractionPaused,
    hoseDragging,
    mode,
    automaticOperationMirrorView,
    operationMirrorView,
    screwDragging,
    showShiftOperationCue,
  ]);
  const handleBoundsReady = useCallback((nextBounds: PistonOscillationSceneBounds) => {
    setBounds((current) => current ?? nextBounds);
  }, []);
  const setPistonOffset = useCallback((nextOffsetMm: number) => {
    pistonOffsetMmRef.current = nextOffsetMm;
    setPistonOffsetMm(nextOffsetMm);
    if (spaceHeldRef.current && mouseHeldRef.current) setPistonPhase('pressing');
  }, []);
  const handleEquilibriumHeightChange = useCallback((nextHeightMm: number) => {
    const clampedHeightMm = clampPistonEquilibriumHeightMm(nextHeightMm);
    const previousHeightMm = pistonEquilibriumHeightMmRef.current;
    if (Math.abs(clampedHeightMm - previousHeightMm) > 0.0001) {
      setMouseVisualizationAction(
        clampedHeightMm > previousHeightMm ? 'moveUp' : 'moveDown',
      );
    }
    unsupportedDropVelocityMmPerSRef.current = 0;
    pistonEquilibriumHeightMmRef.current = clampedHeightMm;
    setPistonEquilibriumHeightMm(clampedHeightMm);
    setPistonPhase('adjustingHeight');
    setHeightAdjustmentStage('readingHeight');
  }, []);
  const handleLockingScrewProgressDelta = useCallback((progressDelta: number) => {
    if (guideInteractionPaused) return;
    if (Math.abs(progressDelta) < 0.000001) return;
    if (screwGuideGestureRejectedRef.current) return;
    let committedDelta = progressDelta;
    if (onGuideActionAttempt) {
      const authorizedAction = screwGuideGestureAuthorizedActionRef.current;
      if (authorizedAction) {
        if (authorizedAction === 'tightenScrew' && !spaceHeldRef.current) return;
        const matchesAuthorizedDirection = authorizedAction === 'tightenScrew'
          ? progressDelta > 0
          : progressDelta < 0;
        if (!matchesAuthorizedDirection) return;
      } else {
        screwGuideGesturePendingDeltaRef.current += progressDelta;
        if (
          Math.abs(screwGuideGesturePendingDeltaRef.current)
            < PISTON_GUIDE_SCREW_DIRECTION_THRESHOLD
        ) return;
        const action = screwGuideGesturePendingDeltaRef.current > 0
          ? 'tightenScrew'
          : 'loosenScrew';
        if (!attemptGuideAction(action)) {
          screwGuideGestureRejectedRef.current = true;
          screwGuideGesturePendingDeltaRef.current = 0;
          return;
        }
        screwGuideGestureAuthorizedActionRef.current = action;
        committedDelta = screwGuideGesturePendingDeltaRef.current;
        screwGuideGesturePendingDeltaRef.current = 0;
      }
    }
    setMouseVisualizationAction(
      committedDelta > 0 ? 'rotateClockwise' : 'rotateCounterclockwise',
    );
    setLockingScrewProgress((currentProgress) => {
      const clampedProgress = Math.min(1, Math.max(0, currentProgress + committedDelta));
      lockingScrewProgressRef.current = clampedProgress;
      return clampedProgress;
    });
  }, [attemptGuideAction, guideInteractionPaused, onGuideActionAttempt]);
  const handleScrewDraggingChange = useCallback((dragging: boolean) => {
    setScrewDragging(dragging);
    if (!dragging) setMouseVisualizationAction(null);
    screwGuideGestureAuthorizedActionRef.current = null;
    screwGuideGesturePendingDeltaRef.current = 0;
    screwGuideGestureRejectedRef.current = false;
    if (dragging) {
      screwDragStartProgressRef.current = lockingScrewProgressRef.current;
      return;
    }
    const loosenedDuringGesture = lockingScrewProgressRef.current
      < screwDragStartProgressRef.current - 0.001;
    if (
      hoseState === 'disconnected'
      && loosenedDuringGesture
      && getPistonLockingScrewClampState(lockingScrewProgressRef.current) === 'loose'
    ) {
      setHeightAdjustmentStage('readingHeight');
    }
  }, [hoseState]);
  const cancelPistonRebound = useCallback(() => {
    if (reboundAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(reboundAnimationFrameRef.current);
      reboundAnimationFrameRef.current = null;
    }
  }, []);
  const cancelUnsupportedDrop = useCallback(() => {
    if (unsupportedDropAnimationFrameRef.current === null) return false;
    window.cancelAnimationFrame(unsupportedDropAnimationFrameRef.current);
    unsupportedDropAnimationFrameRef.current = null;
    return true;
  }, []);
  const cancelGuideHeightReset = useCallback(() => {
    if (guideHeightResetAnimationFrameRef.current === null) return;
    window.cancelAnimationFrame(guideHeightResetAnimationFrameRef.current);
    guideHeightResetAnimationFrameRef.current = null;
  }, []);

  useEffect(() => {
    if (handledGuideSessionRevisionRef.current === guideSessionRevision) return;
    handledGuideSessionRevisionRef.current = guideSessionRevision;
    if (guideSessionRevision <= 0) return;

    cancelPistonRebound();
    cancelUnsupportedDrop();
    abortHeldInputs();
    const restoredHeightMm = clampPistonEquilibriumHeightMm(
      guideInitialInstrumentState?.equilibriumHeightMm
        ?? PISTON_EQUILIBRIUM_HEIGHT_DEFAULT_MM,
    );
    const restoredOffsetMm = guideInitialInstrumentState?.pistonOffsetMm ?? 0;
    const restoredScrewProgress = Math.min(
      1,
      Math.max(0, guideInitialInstrumentState?.lockingScrewProgress ?? 0),
    );
    setMode(
      guideRequestedFocusMode
        ?? guideInitialInstrumentState?.focusMode
        ?? 'overview',
    );
    setTransitionActive(false);
    hoseGuideSupportLostDuringDragRef.current = false;
    setHoseState(guideInitialInstrumentState?.hoseState ?? 'disconnected');
    setHoseDragging(false);
    setHoseHovered(false);
    setCameraGestureActive(false);
    setHoseGhostOffset([0, 0, 0]);
    setHoseWithinMagneticRange(false);
    lockingScrewProgressRef.current = restoredScrewProgress;
    screwDragStartProgressRef.current = restoredScrewProgress;
    setLockingScrewProgress(restoredScrewProgress);
    setScrewHovered(false);
    setScrewDragging(false);
    setScrewHitPoint(null);
    pistonOffsetMmRef.current = restoredOffsetMm;
    pistonEquilibriumHeightMmRef.current = restoredHeightMm;
    unsupportedDropVelocityMmPerSRef.current = 0;
    setPistonOffsetMm(restoredOffsetMm);
    setPistonEquilibriumHeightMm(restoredHeightMm);
    setPistonPhase(guideInitialInstrumentState?.pistonPhase ?? 'idle');
    setOperationMirrorViewOverride(null);
    setHeightAdjustmentStage(
      guideInitialInstrumentState?.heightAdjustmentStage ?? 'readingHeight',
    );
    setOverviewFramingHeightMm(restoredHeightMm);
    setOverviewPoseRevision((current) => current + 1);
    setReleaseGapMs(null);
    guidePauseStartedAtMsRef.current = null;
    guideAccumulatedPauseMsRef.current = 0;
    guideHeightResetHandledRevisionRef.current = null;
    guideSupportLossReportedRef.current = false;
  }, [
    abortHeldInputs,
    cancelPistonRebound,
    cancelUnsupportedDrop,
    guideInitialInstrumentState,
    guideSessionRevision,
    guideRequestedFocusMode,
  ]);

  useEffect(() => {
    if (!demoFrame) return;
    cancelPistonRebound();
    cancelUnsupportedDrop();
    const heightBeingAdjusted = demoFrame.platformAction === 'adjustHeight';
    const pistonBeingPressed = demoFrame.platformAction === 'press';
    const platformBeingHeldForLocking = demoFrame.activeControl === 'screw'
      && demoFrame.hoseState === 'disconnected';
    const nextMouseHeld = heightBeingAdjusted || pistonBeingPressed;
    const nextSpaceHeld = demoFrame.leftHandSupporting
      || platformBeingHeldForLocking
      || pistonBeingPressed;
    const nextPistonPhase: PistonInteractionPhase = heightBeingAdjusted
      ? 'adjustingHeight'
      : pistonBeingPressed
        ? 'pressing'
        : demoFrame.releaseElapsedSeconds !== null
          && demoFrame.releaseElapsedSeconds < 0.8
          && Math.abs(demoFrame.pistonOffsetMm) >= 0.02
          ? 'rebounding'
          : platformBeingHeldForLocking
            ? 'holding'
            : 'idle';

    if (demoFrame.focusMode === 'overview') {
      setOverviewFramingHeightMm(demoFrame.equilibriumHeightMm);
      setOverviewPoseRevision((current) => current + 1);
    }
    setMode(demoFrame.focusMode);
    if (demoFrame.operationMirrorView === 'scaleReadingView' || heightBeingAdjusted) {
      setHeightAdjustmentStage('readingHeight');
    }
    if (demoFrame.operationMirrorView === 'screwOperationView') {
      setHeightAdjustmentStage('lockingHeight');
    }
    setHoseState(demoFrame.hoseState);
    setHoseDragging(demoFrame.hoseDragging);
    setHoseGhostOffset([0, 0, 0]);
    setHoseWithinMagneticRange(demoFrame.hoseWithinMagneticRange);
    lockingScrewProgressRef.current = demoFrame.lockingScrewProgress;
    setLockingScrewProgress(demoFrame.lockingScrewProgress);
    pistonEquilibriumHeightMmRef.current = demoFrame.equilibriumHeightMm;
    setPistonEquilibriumHeightMm(demoFrame.equilibriumHeightMm);
    pistonOffsetMmRef.current = demoFrame.pistonOffsetMm;
    setPistonOffsetMm(demoFrame.pistonOffsetMm);
    mouseHeldRef.current = nextMouseHeld;
    spaceHeldRef.current = nextSpaceHeld;
    setMouseHeld(nextMouseHeld);
    setSpaceHeld(nextSpaceHeld);
    setPistonPhase(nextPistonPhase);
  }, [cancelPistonRebound, cancelUnsupportedDrop, demoFrame]);
  useEffect(() => {
    if (
      demoFrame
      || (effectiveDemoPlaybackPhase !== 'completed'
        && effectiveDemoPlaybackPhase !== 'terminated')
    ) return;
    setHoseDragging(false);
    setHoseGhostOffset([0, 0, 0]);
    setHoseWithinMagneticRange(false);
  }, [demoFrame, effectiveDemoPlaybackPhase]);
  const startPistonRebound = useCallback((
    trajectory: PistonOscillationTrajectory,
    startedAtMs: number,
  ) => {
    cancelPistonRebound();
    const initialOffsetMm = pistonOffsetMmRef.current;
    if (Math.abs(initialOffsetMm) < 0.02) {
      setPistonOffset(0);
      setPistonPhase('idle');
      return;
    }
    setPistonPhase('rebounding');
    const accumulatedPauseMsAtStart = guideAccumulatedPauseMsRef.current;
    const animate = (nowMs: number) => {
      const activePauseMs = guidePausedRef.current
        && guidePauseStartedAtMsRef.current !== null
        ? nowMs - guidePauseStartedAtMsRef.current
        : 0;
      const elapsedMs = Math.max(
        0,
        nowMs
          - startedAtMs
          - (guideAccumulatedPauseMsRef.current - accumulatedPauseMsAtStart)
          - activePauseMs,
      );
      const elapsedSeconds = elapsedMs / 1000;
      const nextOffsetMm = getPistonOscillationTrajectorySampleAt(
        trajectory,
        elapsedSeconds,
      ).displacementM * 1_000;
      pistonOffsetMmRef.current = nextOffsetMm;
      setPistonOffsetMm(nextOffsetMm);
      if (elapsedMs >= PISTON_REBOUND_VISIBLE_DURATION_MS) {
        pistonOffsetMmRef.current = 0;
        setPistonOffsetMm(0);
        setPistonPhase('idle');
        reboundAnimationFrameRef.current = null;
        return;
      }
      reboundAnimationFrameRef.current = window.requestAnimationFrame(animate);
    };
    reboundAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [cancelPistonRebound, setPistonOffset]);
  const finishTwoHandRelease = useCallback(() => {
    if (spaceHeldRef.current || mouseHeldRef.current) return;
    const spaceReleasedAt = spaceReleasedAtRef.current;
    const mouseReleasedAt = mouseReleasedAtRef.current;
    setReleaseGapMs(
      spaceReleasedAt !== null && mouseReleasedAt !== null
        ? Math.abs(spaceReleasedAt - mouseReleasedAt)
        : null,
    );
    const initialDisplacementMm = pistonOffsetMmRef.current;
    if (pistonEquilibriumHeightMmRef.current + initialDisplacementMm < 0) {
      setPistonOffset(0);
      setPistonPhase('idle');
      return;
    }
    if (initialDisplacementMm >= -0.02) {
      setPistonOffset(0);
      setPistonPhase('idle');
      return;
    }
    const trajectory = simulatePistonOscillationRelease({
      equilibriumHeightMm: pistonEquilibriumHeightMmRef.current,
      initialDisplacementMm,
    }, { sensorSampleRateHz });
    const releaseStartedAtMs = performance.now();
    if (onReleaseEvent && initialDisplacementMm < -0.02) {
      releaseEventIdRef.current += 1;
      const releaseEvent: PistonOscillationReleaseEvent = {
        id: releaseEventIdRef.current,
        startedAtMs: releaseStartedAtMs,
        trajectory,
      };
      onReleaseEvent(releaseEvent);
    }
    startPistonRebound(trajectory, releaseStartedAtMs);
  }, [onReleaseEvent, sensorSampleRateHz, setPistonOffset, startPistonRebound]);
  const handleMouseHeldChange = useCallback((held: boolean, releasedAtMs?: number) => {
    mouseHeldRef.current = held;
    setMouseHeld(held);
    if (held) {
      setMouseVisualizationAction(
        platformMode === 'press' ? 'moveDown' : 'click',
      );
      heldInputInterruptedRef.current = false;
      cancelPistonRebound();
      if (platformMode === 'adjustHeight') setHeightAdjustmentStage('readingHeight');
      mouseReleasedAtRef.current = null;
      if (spaceHeldRef.current) {
        spaceReleasedAtRef.current = null;
        setReleaseGapMs(null);
        setPistonPhase('pressing');
      } else {
        setPistonPhase('ready');
      }
      return;
    }
    setMouseVisualizationAction(null);
    mouseReleasedAtRef.current = releasedAtMs ?? performance.now();
    if (heldInputInterruptedRef.current) {
      setPistonPhase('idle');
      return;
    }
    if (spaceHeldRef.current) {
      setPistonPhase('holding');
      return;
    }
    if (platformMode === 'adjustHeight') {
      setPistonPhase('idle');
      return;
    }
    finishTwoHandRelease();
  }, [cancelPistonRebound, finishTwoHandRelease, platformMode]);
  const setHoseCameraClaim = useCallback((claimed: boolean) => {
    hoseCameraClaimedRef.current = claimed;
    const controls = controlsRef.current;
    if (controls) controls.enableRotate = !claimed;
  }, []);
  const handleHoseHoverChange = useCallback((hovered: boolean) => {
    setHoseCameraClaim(hovered);
    setHoseHovered(hovered);
  }, [setHoseCameraClaim]);
  const handleHoseDragStart = useCallback(() => {
    const action = hoseState === 'connected' ? 'disconnectHose' : 'reconnectHose';
    if (!attemptGuideAction(action)) return false;
    hoseGuideSupportLostDuringDragRef.current = false;
    setHoseCameraClaim(true);
    setCameraGestureActive(false);
    if (spaceHeldRef.current) {
      cancelUnsupportedDrop();
      unsupportedDropVelocityMmPerSRef.current = 0;
    }
    setHoseDragging(true);
    setMouseVisualizationAction('click');
    setHoseHovered(true);
    setHoseGhostOffset([0, 0, 0]);
    setHoseWithinMagneticRange(hoseState === 'connected');
    return true;
  }, [attemptGuideAction, cancelUnsupportedDrop, hoseState, setHoseCameraClaim]);
  const commitGuideHoseSupportLossDuringDrag = useCallback(() => {
    if (
      !onGuideActionAttempt
      || hoseState !== 'connected'
      || hoseGuideSupportLostDuringDragRef.current
    ) return;
    hoseGuideSupportLostDuringDragRef.current = true;
    setHoseState('disconnected');
    setHoseWithinMagneticRange(false);
  }, [hoseState, onGuideActionAttempt]);
  const handleHoseDragChange = useCallback((
    offset: THREE.Vector3,
    withinMagneticRange: boolean,
  ) => {
    setHoseGhostOffset([offset.x, 0, offset.z]);
    setHoseWithinMagneticRange(withinMagneticRange);
    if (!withinMagneticRange && !spaceHeldRef.current) {
      commitGuideHoseSupportLossDuringDrag();
    }
  }, [commitGuideHoseSupportLossDuringDrag]);
  useEffect(() => {
    if (
      hoseDragging
      && !hoseWithinMagneticRange
      && !spaceHeld
    ) commitGuideHoseSupportLossDuringDrag();
  }, [
    commitGuideHoseSupportLossDuringDrag,
    hoseDragging,
    hoseWithinMagneticRange,
    spaceHeld,
  ]);
  const handleHoseDragEnd = useCallback((
    _offset: THREE.Vector3,
    withinMagneticRange: boolean,
  ) => {
    setHoseCameraClaim(false);
    setCameraGestureActive(false);
    const supportLostDuringDrag = hoseGuideSupportLostDuringDragRef.current;
    hoseGuideSupportLostDuringDragRef.current = false;
    const nextHoseState: PistonOscillationHoseConnectionState = supportLostDuringDrag
      ? 'disconnected'
      : withinMagneticRange
        ? 'connected'
        : 'disconnected';
    setHoseState(nextHoseState);
    setHoseDragging(false);
    setMouseVisualizationAction(null);
    setHoseHovered(false);
    setHoseGhostOffset([0, 0, 0]);
    setHoseWithinMagneticRange(withinMagneticRange);
  }, [
    setHoseCameraClaim,
  ]);
  const hoseInteractionState = hoseDragging
    ? hoseWithinMagneticRange
      ? interactionCopy.hoseInRange
      : interactionCopy.hoseOutsideRange
    : hoseState === 'connected'
      ? interactionCopy.hoseConnected
      : interactionCopy.hoseDisconnected;
  const pistonPhaseLabel: Record<PistonInteractionPhase, string> = {
    idle: platformMode === 'adjustHeight'
      ? interactionCopy.waitingHeightDrag
      : interactionCopy.waitingBothHands,
    ready: platformMode === 'adjustHeight'
      ? mouseHeld
        ? interactionCopy.rightHandReady
        : interactionCopy.leftHandReady
      : interactionCopy.oneHandReady,
    pressing: platformMode === 'adjustHeight'
      ? spaceHeld && mouseHeld
        ? interactionCopy.handoffInProgress
        : interactionCopy.rightHandDragging
      : platformMode === 'screwLocked'
        ? interactionCopy.screwHolding
        : interactionCopy.bothHandsPressing,
    adjustingHeight: spaceHeld && mouseHeld
      ? interactionCopy.handoffInProgress
      : interactionCopy.rightHandDragging,
    holding: platformMode === 'adjustHeight'
      ? interactionCopy.platformSupported
      : interactionCopy.oneHandHolding,
    falling: interactionCopy.falling,
    rebounding: interactionCopy.rebounding,
  };
  const platformModeLabel: Record<PistonPlatformMode, string> = {
    press: interactionCopy.experimentPress,
    adjustHeight: interactionCopy.heightAdjustment,
    screwLocked: interactionCopy.heightFixed,
  };
  const overlayMotionRef = usePreviewOverlayMotion<HTMLDivElement>({
    layoutRevision: [
      mode,
      Number(transitionActive),
      lockingScrewClampState,
      hoseState,
      pistonPhase,
      Number(releaseGapMs !== null),
      demoStepPanelMode,
      effectiveParentTopRightPanelMode,
    ].join(':'),
  });

  useEffect(() => {
    if (demoActive) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        guideInteractionPaused
        ||
        (mode !== 'pistonFocus' && mode !== 'overview')
        || event.code !== 'Space'
        || isEditableKeyboardTarget(event.target)
      ) return;
      event.preventDefault();
      if (event.repeat || spaceHeldRef.current) return;
      if (!attemptGuideAction('leftHandPress')) return;
      cancelPistonRebound();
      heldInputInterruptedRef.current = false;
      spaceHeldRef.current = true;
      setSpaceHeld(true);
      spaceReleasedAtRef.current = null;
      if (mouseHeldRef.current) {
        mouseReleasedAtRef.current = null;
        setReleaseGapMs(null);
        setPistonPhase('pressing');
      } else {
        setPistonPhase('ready');
      }
    };
    const releaseSpaceHand = () => {
      if (!spaceHeldRef.current) return;
      attemptGuideAction('leftHandRelease');
      spaceHeldRef.current = false;
      setSpaceHeld(false);
      spaceReleasedAtRef.current = performance.now();
      if (mouseHeldRef.current) {
        setPistonPhase('holding');
        return;
      }
      finishTwoHandRelease();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      releaseSpaceHand();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') abortHeldInputs();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    abortHeldInputs,
    attemptGuideAction,
    cancelPistonRebound,
    demoActive,
    finishTwoHandRelease,
    guideInteractionPaused,
    mode,
  ]);

  useEffect(() => {
    if (mode === 'pistonFocus') return;
    if (mode === 'overview' && spaceHeldRef.current) {
      cancelPistonRebound();
      cancelUnsupportedDrop();
      unsupportedDropVelocityMmPerSRef.current = 0;
      mouseHeldRef.current = false;
      mouseReleasedAtRef.current = null;
      setMouseHeld(false);
      setPlatformHovered(false);
      setPistonPhase('holding');
      setReleaseGapMs(null);
      return;
    }
    cancelPistonRebound();
    abortHeldInputs();
    pistonOffsetMmRef.current = 0;
    setPistonOffsetMm(0);
    setPistonPhase('idle');
    setReleaseGapMs(null);
  }, [abortHeldInputs, cancelPistonRebound, cancelUnsupportedDrop, mode]);

  useEffect(() => {
    if (
      !onGuideActionAttempt
      || demoActive
      || guideInteractionPaused
      || guideHeightReset !== null
      || hoseState !== 'disconnected'
      || lockingScrewClampState !== 'loose'
    ) return;
    const elevated = pistonEquilibriumHeightMm
      > PISTON_EQUILIBRIUM_HEIGHT_MIN_MM + 0.05;
    if (!elevated) {
      guideSupportLossReportedRef.current = false;
      return;
    }
    if (spaceHeldRef.current || mouseHeldRef.current) return;
    if (guideSupportLossReportedRef.current) return;
    guideSupportLossReportedRef.current = true;
    onGuideSupportLoss?.({
      type: 'supportLost',
      heightMm: pistonEquilibriumHeightMmRef.current,
    });
  }, [
    demoActive,
    guideHeightReset,
    guideInteractionPaused,
    hoseState,
    lockingScrewClampState,
    mouseHeld,
    onGuideActionAttempt,
    onGuideSupportLoss,
    pistonEquilibriumHeightMm,
    spaceHeld,
  ]);

  useEffect(() => {
    if (
      guideHeightReset?.phase !== 'resetting'
      || guideHeightResetHandledRevisionRef.current === guideHeightReset.revision
    ) return undefined;
    guideHeightResetHandledRevisionRef.current = guideHeightReset.revision;
    cancelPistonRebound();
    cancelUnsupportedDrop();
    cancelGuideHeightReset();
    abortHeldInputs();
    setMode('pistonFocus');
    setOperationMirrorViewOverride(null);
    setHeightAdjustmentStage('readingHeight');
    lockingScrewProgressRef.current = 0;
    setLockingScrewProgress(0);
    setScrewDragging(false);
    pistonOffsetMmRef.current = 0;
    setPistonOffsetMm(0);
    const startedHeightMm = clampPistonEquilibriumHeightMm(
      guideHeightReset.startedHeightMm,
    );
    pistonEquilibriumHeightMmRef.current = startedHeightMm;
    setPistonEquilibriumHeightMm(startedHeightMm);
    const durationMs = startedHeightMm <= 0.05
      ? 120
      : Math.min(
          PISTON_GUIDE_HEIGHT_RESET_MAX_DURATION_MS,
          Math.max(
            PISTON_GUIDE_HEIGHT_RESET_MIN_DURATION_MS,
            PISTON_GUIDE_HEIGHT_RESET_MIN_DURATION_MS + startedHeightMm * 3.75,
          ),
        );
    const startedAtMs = performance.now();
    setPistonPhase('falling');
    const animateReset = (nowMs: number) => {
      const progress = Math.min(1, Math.max(0, (nowMs - startedAtMs) / durationMs));
      const easedProgress = progress * progress;
      const nextHeightMm = startedHeightMm * (1 - easedProgress);
      pistonEquilibriumHeightMmRef.current = nextHeightMm;
      setPistonEquilibriumHeightMm(nextHeightMm);
      if (progress < 1) {
        guideHeightResetAnimationFrameRef.current = window.requestAnimationFrame(animateReset);
        return;
      }
      guideHeightResetAnimationFrameRef.current = null;
      pistonEquilibriumHeightMmRef.current = PISTON_EQUILIBRIUM_HEIGHT_MIN_MM;
      setPistonEquilibriumHeightMm(PISTON_EQUILIBRIUM_HEIGHT_MIN_MM);
      setPistonPhase('idle');
      guideSupportLossReportedRef.current = false;
      onGuideHeightResetCompleteRef.current?.();
    };
    guideHeightResetAnimationFrameRef.current = window.requestAnimationFrame(animateReset);
    return cancelGuideHeightReset;
  }, [
    abortHeldInputs,
    cancelGuideHeightReset,
    cancelPistonRebound,
    cancelUnsupportedDrop,
    guideHeightReset?.phase,
    guideHeightReset?.revision,
  ]);

  useEffect(() => {
    if (demoActive || guideInteractionPaused) {
      cancelUnsupportedDrop();
      if (!guideInteractionPaused) unsupportedDropVelocityMmPerSRef.current = 0;
      return undefined;
    }
    const unsupported = !onGuideActionAttempt
      && hoseState === 'disconnected'
      && lockingScrewClampState === 'loose'
      && !spaceHeld
      && !mouseHeld;
    if (!unsupported) {
      const wasFalling = cancelUnsupportedDrop();
      unsupportedDropVelocityMmPerSRef.current = 0;
      if (wasFalling) {
        setPistonPhase(spaceHeldRef.current || mouseHeldRef.current ? 'holding' : 'idle');
      }
      return;
    }
    if (
      pistonEquilibriumHeightMmRef.current
        <= PISTON_EQUILIBRIUM_HEIGHT_MIN_MM + 0.001
      || unsupportedDropAnimationFrameRef.current !== null
    ) return;

    cancelPistonRebound();
    pistonOffsetMmRef.current = 0;
    setPistonOffsetMm(0);
    let previousFrameAtMs = performance.now();
    setPistonPhase('falling');
    setHeightAdjustmentStage('readingHeight');
    const animateDrop = (nowMs: number) => {
      if (
        getPistonLockingScrewClampState(lockingScrewProgressRef.current) === 'locked'
        || spaceHeldRef.current
        || mouseHeldRef.current
      ) {
        unsupportedDropAnimationFrameRef.current = null;
        unsupportedDropVelocityMmPerSRef.current = 0;
        setPistonPhase(spaceHeldRef.current || mouseHeldRef.current ? 'holding' : 'idle');
        return;
      }
      const elapsedSeconds = Math.min((nowMs - previousFrameAtMs) / 1000, 0.05);
      previousFrameAtMs = nowMs;
      const accelerationMmPerS2 = PISTON_UNSUPPORTED_DROP_ACCELERATION_MM_PER_S2
        * getPistonUnsupportedDropAccelerationScale(lockingScrewProgressRef.current);
      const droppedDistanceMm = unsupportedDropVelocityMmPerSRef.current * elapsedSeconds
        + 0.5 * accelerationMmPerS2 * elapsedSeconds ** 2;
      unsupportedDropVelocityMmPerSRef.current += accelerationMmPerS2 * elapsedSeconds;
      const nextHeightMm = Math.max(
        PISTON_EQUILIBRIUM_HEIGHT_MIN_MM,
        pistonEquilibriumHeightMmRef.current - droppedDistanceMm,
      );
      pistonEquilibriumHeightMmRef.current = nextHeightMm;
      setPistonEquilibriumHeightMm(nextHeightMm);
      if (nextHeightMm <= PISTON_EQUILIBRIUM_HEIGHT_MIN_MM + 0.001) {
        unsupportedDropAnimationFrameRef.current = null;
        unsupportedDropVelocityMmPerSRef.current = 0;
        setPistonPhase('idle');
        return;
      }
      unsupportedDropAnimationFrameRef.current = window.requestAnimationFrame(animateDrop);
    };
    unsupportedDropAnimationFrameRef.current = window.requestAnimationFrame(animateDrop);
    return undefined;
  }, [
    cancelPistonRebound,
    cancelUnsupportedDrop,
    hoseState,
    lockingScrewClampState,
    mouseHeld,
    spaceHeld,
    demoActive,
    guideInteractionPaused,
    onGuideActionAttempt,
  ]);

  useEffect(() => () => {
    cancelPistonRebound();
    cancelUnsupportedDrop();
    cancelGuideHeightReset();
    if (guideRejectedActionTimerRef.current !== null) {
      window.clearTimeout(guideRejectedActionTimerRef.current);
    }
  }, [cancelGuideHeightReset, cancelPistonRebound, cancelUnsupportedDrop]);

  useEffect(() => {
    if (handledOverviewRevisionRef.current === overviewRevision) return;
    handledOverviewRevisionRef.current = overviewRevision;
    enterOverview();
  }, [enterOverview, overviewRevision]);

  return (
    <div className={`piston-oscillation-interaction-workspace studio-theme-${sceneTheme}`}>
      <div className="piston-oscillation-interaction-workspace-content">
      <section
        className={`piston-oscillation-interaction-stage ${focusActive ? 'is-focused' : ''} ${
          viewportWarningShakeRevision > 0
            ? `is-viewport-warning-shaking-${viewportWarningShakeRevision % 2}`
            : ''
        }`.trim()}
        data-piston-oscillation-interaction-workspace="true"
        data-piston-focus-mode={mode}
        data-piston-focus-hose-state={hoseState}
        data-piston-focus-hose-dragging={hoseDragging ? 'true' : 'false'}
        data-piston-focus-guide-snap-target-mm={guideSnapTargetHeightMm ?? 'none'}
        data-piston-focus-hose-within-magnetic-range={
          hoseWithinMagneticRange ? 'true' : 'false'
        }
        data-piston-focus-hose-connected-handle-left={hoseHandleBounds?.connected.left}
        data-piston-focus-hose-connected-handle-top={hoseHandleBounds?.connected.top}
        data-piston-focus-hose-connected-handle-right={hoseHandleBounds?.connected.right}
        data-piston-focus-hose-connected-handle-bottom={hoseHandleBounds?.connected.bottom}
        data-piston-focus-hose-detached-handle-left={hoseHandleBounds?.detached.left}
        data-piston-focus-hose-detached-handle-top={hoseHandleBounds?.detached.top}
        data-piston-focus-hose-detached-handle-right={hoseHandleBounds?.detached.right}
        data-piston-focus-hose-detached-handle-bottom={hoseHandleBounds?.detached.bottom}
        data-piston-power={effectivePowerOn ? 'on' : 'off'}
        data-piston-power-press-progress={effectivePowerPressProgress.toFixed(4)}
        data-piston-power-button-left={powerButtonBounds?.left}
        data-piston-power-button-top={powerButtonBounds?.top}
        data-piston-power-button-right={powerButtonBounds?.right}
        data-piston-power-button-bottom={powerButtonBounds?.bottom}
        data-piston-focus-space-held={spaceHeld ? 'true' : 'false'}
        data-piston-focus-mouse-held={mouseHeld ? 'true' : 'false'}
        data-piston-focus-piston-phase={pistonPhase}
        data-piston-focus-piston-offset-mm={pistonOffsetMm.toFixed(3)}
        data-piston-focus-platform-hovered={platformHovered ? 'true' : 'false'}
        data-piston-focus-platform-x={pistonPlatformPoint?.[0]}
        data-piston-focus-platform-y={pistonPlatformPoint?.[1]}
        data-piston-focus-main-screw-x={lockingScrewPoint?.[0]}
        data-piston-focus-main-screw-y={lockingScrewPoint?.[1]}
        data-piston-focus-platform-mode={platformMode}
        data-piston-focus-platform-clearance-mm={
          pistonPlatformClearanceMm?.toFixed(3)
        }
        data-piston-focus-equilibrium-height-mm={pistonEquilibriumHeightMm.toFixed(3)}
        data-piston-focus-screw-state={lockingScrewClampState}
        data-piston-focus-screw-progress={lockingScrewProgress.toFixed(4)}
        data-piston-focus-screw-lock-threshold={PISTON_LOCKING_SCREW_LOCK_THRESHOLD}
        data-piston-focus-main-camera={
          heightFollowingActive ? 'heightAdjustmentFocus' : mode
        }
        data-piston-focus-operation-mirror-view={operationMirrorView}
        data-piston-focus-height-adjustment-stage={heightAdjustmentStage}
        data-piston-focus-operation-mirror-selection="height-adjustment-stage"
        data-piston-focus-material-palette="deep-blue-gray-low-gloss"
        data-piston-demo-active={demoActive ? 'true' : 'false'}
        data-piston-demo-control={demoFrame?.activeControl ?? 'none'}
        data-piston-demo-highlight={demoFrame?.highlightControl ?? 'none'}
        data-piston-demo-highlights={demoHighlightControls.join(',') || 'none'}
        data-piston-demo-stage={demoFrame?.stage ?? 'none'}
        data-piston-guide-rejected-action={guideRejectedAction ?? 'none'}
        data-piston-viewport-warning-shake-revision={viewportWarningShakeRevision}
        data-piston-demo-step={demoFrame?.stepIndex}
      >
        <Canvas
          camera={{ position: [0.2, 0.52, 0.9], fov: 38, near: 0.001, far: 20 }}
          events={createPistonOscillationPointerEvents}
          dpr={[1, 1.5]}
          frameloop="demand"
          shadows="soft"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
          }}
        >
          <PistonOscillationSceneLighting sceneTheme={sceneTheme} />
          <PistonOscillationSceneModel
            powerOn={effectivePowerOn}
            powerPressProgress={effectivePowerPressProgress}
            powerInteractionEnabled={
              !demoActive
              && !guideInteractionPaused
              && (mode === 'overview' || mode === 'powerFocus')
            }
            hoseState={hoseState}
            hoseInteractionEnabled={
              !demoActive
              && !guideInteractionPaused
              && (!cameraGestureActive || hoseHovered || hoseDragging)
              && (mode === 'overview' || mode === 'pistonFocus')
            }
            hoseDragging={hoseDragging}
            hoseWithinMagneticRange={hoseWithinMagneticRange}
            hoseGhostOffset={hoseGhostOffset}
            pistonEquilibriumHeightMm={pistonEquilibriumHeightMm}
            pistonOscillationOffsetMm={pistonOffsetMm}
            lockingScrewProgress={lockingScrewProgress}
            demoFocusTarget={effectiveMainFocusTarget}
            demoFocusTheme={sceneTheme}
            demoFocusPulseElapsedSeconds={effectiveFocusPulseElapsedSeconds}
            demoHoseDragProgress={demoHoseDragProgress}
            demoSnapGuideActive={demoSnapGuideActive}
            demoSnapGuidePulseElapsedSeconds={effectiveFocusPulseElapsedSeconds}
            interactionEnabled={!demoActive && !guideInteractionPaused}
            onBoundsReady={handleBoundsReady}
            onPistonFocusRequest={() => setMode('pistonFocus')}
            onPowerPress={requestPowerPress}
            onHoseHoverChange={handleHoseHoverChange}
            onHoseDragStart={handleHoseDragStart}
            onHoseDragChange={handleHoseDragChange}
            onHoseDragEnd={handleHoseDragEnd}
          />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={
              !transitionActive &&
              !demoActive &&
              !guideInteractionPaused &&
              !hoseHovered &&
              !hoseDragging &&
              !focusActive
            }
            enablePan
            enableRotate={!hoseHovered && !hoseDragging}
            enableZoom
            minDistance={0.05}
            maxDistance={4}
            onStart={() => {
              if (hoseCameraClaimedRef.current) return;
              setCameraGestureActive(true);
            }}
            onEnd={() => setCameraGestureActive(false)}
          />
          <MainCameraRig
            bounds={bounds}
            mode={mode}
            cameraPreset={cameraPreset}
            poseOverride={mainPoseOverride}
            poseKeyOverride={
              heightFollowingActive
                ? 'heightAdjustmentFocus'
                : mode === 'overview'
                  ? `overview:${cameraPreset}:${overviewFramingHeightMm.toFixed(3)}:${overviewPoseRevision}`
                  : undefined
            }
            controlsRef={controlsRef}
            onTransitionActiveChange={setTransitionActive}
          />
          <HeightFollowingCameraRig
            enabled={heightFollowingActive}
            heightMm={pistonEquilibriumHeightMm}
            controlsRef={controlsRef}
          />
          <HoseHandleProbe onChange={setHoseHandleBounds} />
          <PowerButtonProbe onChange={setPowerButtonBounds} />
          <PistonPlatformProbe onChange={setPistonPlatformPoint} />
          <PistonLockingScrewProbe onChange={setLockingScrewPoint} />
          <PistonPlatformClearanceProbe onChange={setPistonPlatformClearanceMm} />
          <PistonPlatformControl
            enabled={
              mode === 'pistonFocus'
              && !transitionActive
              && !demoActive
              && !guideInteractionPaused
            }
            platformMode={platformMode}
            spaceHeld={spaceHeld}
            offsetMm={pistonOffsetMm}
            equilibriumHeightMm={pistonEquilibriumHeightMm}
            guideSnapTargetHeightMm={guideSnapTargetHeightMm}
            onMouseHeldChange={handleMouseHeldChange}
            onOffsetChange={setPistonOffset}
            onEquilibriumHeightChange={handleEquilibriumHeightChange}
            onHoverChange={setPlatformHovered}
            onActionAttempt={attemptGuideAction}
            releaseFrozen={guideTimeFrozen}
          />
        </Canvas>

        {mode === 'overview' && !transitionActive && !demoActive && !guideInteractionPaused && pistonPlatformPoint ? (
          <button
            type="button"
            className="piston-focus-interaction-entry-hotspot is-piston"
            data-piston-focus-entry="piston"
            aria-label={interactionCopy.focusEntryAria}
            tabIndex={-1}
            style={{
              left: `${((pistonPlatformPoint[0] + 1) / 2) * 100}%`,
              top: `${((1 - pistonPlatformPoint[1]) / 2) * 100}%`,
            }}
            onDoubleClick={() => setMode('pistonFocus')}
          />
        ) : null}

        <div
          className={`piston-focus-interaction-operation-mirror ${
            screwDragging ? 'is-dragging' : screwHovered ? 'is-hovered' : ''
          } ${
            demoHighlightControls.includes('mirrorOutline')
            || guideVisualCue === 'mirrorOutline'
              ? 'is-demo-outline-highlighted'
              : ''
          } ${
            scaleReadingOperationMirrorActive
              ? 'is-scale-reading-view'
              : 'is-screw-operation-view'
          } ${operationMirrorMotionClass}`.trim()}
          data-piston-focus-operation-mirror="true"
          data-piston-focus-operation-mirror-motion={operationMirrorMode}
          data-piston-focus-operation-mirror-ready={operationMirrorViewReady ? 'true' : 'false'}
          data-piston-focus-operation-mirror-projection={
            scaleReadingOperationMirrorActive ? 'orthographic' : 'perspective'
          }
          data-screw-interaction-state={screwDragging ? 'dragging' : screwHovered ? 'hovered' : 'idle'}
          data-screw-hit-x={screwHitPoint?.[0]}
          data-screw-hit-y={screwHitPoint?.[1]}
          aria-hidden={operationMirrorMode === 'hidden' || !operationMirrorInitialFrameReady}
          aria-label={
            scaleReadingOperationMirrorActive
              ? interactionCopy.scaleReadingMirrorAria
              : interactionCopy.lockingScrewMirrorAria
          }
        >
          <Canvas
            className="piston-focus-interaction-operation-mirror-canvas"
            camera={{
              position: [...operationMirrorScrewPose.position],
              fov: operationMirrorScrewPose.fov,
              near: operationMirrorScrewPose.near,
              far: operationMirrorScrewPose.far,
            }}
            events={createPistonOscillationPointerEvents}
            dpr={[1, 1.5]}
            frameloop="demand"
            shadows="soft"
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1;
            }}
          >
            <PistonOscillationSceneLighting
              sceneTheme={sceneTheme}
              scaleReadingDetail={scaleReadingOperationMirrorActive}
            />
            {screwOperationMirrorActive ? (
              <directionalLight
                color="#f2f6f8"
                intensity={0.65}
                position={[1, 0.12, -0.08]}
              />
            ) : null}
            <group visible={screwOperationMirrorActive}>
              <PistonOscillationSceneModel
                hoseState={hoseState}
                pistonEquilibriumHeightMm={pistonEquilibriumHeightMm}
                pistonOscillationOffsetMm={pistonOffsetMm}
                lockingScrewProgress={lockingScrewProgress}
                demoFocusTarget={effectiveMirrorFocusTarget}
                demoFocusTheme={sceneTheme}
                demoFocusPulseElapsedSeconds={effectiveFocusPulseElapsedSeconds}
                operationMirrorView="screwOperationView"
                onOperationMirrorFrameReady={handleOperationMirrorModelReady}
                interactionEnabled={!demoActive && !guideInteractionPaused}
                onBoundsReady={() => undefined}
              />
            </group>
            <group visible={scaleReadingOperationMirrorActive}>
              <PistonOscillationSceneModel
                hoseState={hoseState}
                pistonEquilibriumHeightMm={pistonEquilibriumHeightMm}
                pistonOscillationOffsetMm={pistonOffsetMm}
                lockingScrewProgress={lockingScrewProgress}
                demoFocusTarget={effectiveMirrorFocusTarget}
                demoFocusTheme={sceneTheme}
                demoFocusPulseElapsedSeconds={effectiveFocusPulseElapsedSeconds}
                scaleReadingVisualEnhancement
                operationMirrorView="scaleReadingView"
                onOperationMirrorFrameReady={handleOperationMirrorModelReady}
                interactionEnabled={!demoActive && !guideInteractionPaused}
                onBoundsReady={() => undefined}
              />
            </group>
            <PerspectiveCamera
              makeDefault={screwOperationMirrorActive}
              position={[...operationMirrorScrewPose.position]}
              fov={operationMirrorScrewPose.fov}
              near={operationMirrorScrewPose.near}
              far={operationMirrorScrewPose.far}
            />
            <OrthographicCamera
              makeDefault={scaleReadingOperationMirrorActive}
              position={[...operationMirrorScalePose.position]}
              zoom={operationMirrorScalePose.zoom}
              near={operationMirrorScalePose.near}
              far={operationMirrorScalePose.far}
            />
            <OperationMirrorFrameReadyBridge
              view={operationMirrorView}
              onFrameReady={setOperationMirrorRenderedView}
            />
            <OrbitControls
              ref={mirrorControlsRef}
              makeDefault
              enabled={false}
              enablePan
              enableRotate
              enableZoom
              minDistance={0.03}
              maxDistance={2}
              minZoom={scaleReadingOperationMirrorActive ? 500 : 5_000}
              maxZoom={25_000}
            />
            {scaleReadingOperationMirrorActive ? (
              <ScaleReadingCameraRig
                heightMm={pistonEquilibriumHeightMm}
                controlsRef={mirrorControlsRef}
              />
            ) : (
              <FixedCameraRig
                pose={operationMirrorScrewPose}
                controlsRef={mirrorControlsRef}
              />
            )}
            {!demoActive && !guideInteractionPaused && screwOperationMirrorActive ? (
              <OperationMirrorScrewControl
                progress={lockingScrewProgress}
                onProgressDelta={handleLockingScrewProgressDelta}
                onHoverChange={setScrewHovered}
                onDraggingChange={handleScrewDraggingChange}
                onHitPointReady={setScrewHitPoint}
              />
            ) : null}
          </Canvas>
        </div>

        <div
          className="piston-operation-visualization-cue-slot"
          data-piston-operation-visualization-cue-slot="true"
        >
          <PistonOscillationOperationCueView
            cue={effectiveOperationCue}
            language={language}
          />
        </div>

        <div
          ref={overlayMotionRef}
          className="studio-preview-overlay-layer piston-focus-interaction-overlay-layer"
          data-preview-overlay-layer="piston-oscillation"
        >
          <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-left">
            <div
              className={`piston-operation-visualization-toggle-shell is-visible ${
                operationVisualizationEnabled ? 'is-enabled-visual' : 'is-disabled-visual'
              }`}
              data-piston-operation-visualization-toggle-shell="true"
              data-piston-operation-visualization-visual-state={
                operationVisualizationEnabled ? 'on' : 'off'
              }
            >
              <PistonOscillationOperationVisualizationToggle
                enabled={operationVisualizationEnabled}
                onToggle={() => onOperationVisualizationToggle?.()}
                language={language}
              />
            </div>
          </div>
          <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-right">
            {effectiveParentTopRightPanelMode !== 'hidden'
            && displayedOverlayTopRightRef.current ? (
              <div
                className={`piston-focus-interaction-parent-top-right-panel piston-focus-interaction-parent-top-right-panel-${effectiveParentTopRightPanelMode}`}
                data-preview-overlay-item="piston-parent-top-right"
              >
                {displayedOverlayTopRightRef.current}
              </div>
            ) : null}
            {displayedDemoFrame && demoStepPanelMode !== 'hidden' ? (
              <div
                className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${demoStepPanelMode}`}
                data-piston-demo-step-panel="true"
                data-piston-demo-completed={
                  effectiveDemoPlaybackPhase === 'completed' ? 'true' : 'false'
                }
              >
                <div className="studio-heat-demo-step-kicker">
                  <span>
                    {effectiveDemoPlaybackPhase === 'running'
                      ? demoPresentationCopy.stepCounter(
                          displayedDemoFrame.stepIndex,
                          displayedDemoFrame.stepCount,
                        )
                      : effectiveDemoPlaybackPhase === 'paused'
                        ? demoPresentationCopy.paused
                      : effectiveDemoPlaybackPhase === 'completed'
                        ? demoPresentationCopy.completed
                        : demoPresentationCopy.terminated}
                  </span>
                  <i>
                    {effectiveDemoPlaybackPhase === 'running'
                      ? demoPresentationCopy.running
                      : effectiveDemoPlaybackPhase === 'paused'
                        ? demoPresentationCopy.pausedStatus
                      : effectiveDemoPlaybackPhase === 'completed'
                        ? demoPresentationCopy.completedStatus
                        : demoPresentationCopy.terminatedStatus}
                  </i>
                </div>
                <strong>{displayedDemoFrame.stepTitle}</strong>
                <p>{displayedDemoFrame.stepDescription}</p>
                <div><span>{demoPresentationCopy.targetLabel}</span><em>{displayedDemoFrame.stepTarget}</em></div>
                <div><span>{demoPresentationCopy.criterionLabel}</span><em>{displayedDemoFrame.stepProgressCriterion}</em></div>
                <div><span>{demoPresentationCopy.observationLabel}</span><em>{displayedDemoFrame.stepNote}</em></div>
              </div>
            ) : null}
            {restoreDefaultViewLabel ? (
              <button
                type="button"
                className="studio-heat-view-reset piston-oscillation-view-reset"
                data-piston-oscillation-view-reset="true"
                data-preview-overlay-item="piston-view-reset"
                onClick={() => {
                  if (!demoActive) onRestoreDefaultView?.();
                }}
                disabled={demoActive}
              >
                {restoreDefaultViewLabel}
              </button>
            ) : null}
            {overlayBelowDefaultView ? (
              <div
                className="piston-oscillation-below-default-view"
                data-preview-overlay-item="piston-below-default-view"
              >
                {overlayBelowDefaultView}
              </div>
            ) : null}
          </div>

          <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-left">
            <div
              className="studio-heat-interaction-hints"
              data-piston-focus-interaction-hints="true"
              data-preview-overlay-item="piston-interaction-hints"
            >
              <strong>{demoPresentationCopy.instrumentOperation}</strong>
              {hints.map((hint) => <span key={hint}>{hint}</span>)}
            </div>
          </div>

          <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-right">
            {focusActive && mode !== 'powerFocus' ? (
              <div data-preview-overlay-item="piston-focus-panel">
                <div
                  className="studio-heat-focus-panel studio-heat-focus-panel-pump piston-focus-interaction-focus-panel"
                  data-piston-focus-exit-panel="true"
                  data-piston-focus-panel={mode}
                >
                  <div className="studio-heat-focus-title">
                    {mode === 'pistonFocus'
                      ? interactionCopy.pistonFocusTitle
                      : interactionCopy.hoseFocusTitle}
                  </div>
                  <div className="studio-heat-focus-grid">
                    {mode === 'pistonFocus' ? (
                      <>
                        <div className="studio-heat-focus-panel-row">
                          <span>{interactionCopy.screwLabel}</span>
                          <strong data-piston-focus-screw-status="true">{lockingScrewStatus}</strong>
                        </div>
                        <div className="studio-heat-focus-panel-row">
                          <span>{interactionCopy.platformModeLabel}</span>
                          <strong data-piston-focus-platform-mode-status="true">
                            {platformModeLabel[platformMode]}
                          </strong>
                        </div>
                        <div className="studio-heat-focus-panel-row">
                          <span>{interactionCopy.equilibriumHeightLabel}</span>
                          <strong data-piston-focus-height-status="true">
                            {pistonEquilibriumHeightMm.toFixed(1)} mm
                          </strong>
                        </div>
                        <div className="studio-heat-focus-panel-row studio-piston-focus-hand-status-row">
                          <span>
                            {platformMode === 'adjustHeight'
                              ? interactionCopy.handStatusLabel
                              : interactionCopy.bothHandsStatusLabel}
                          </span>
                          <strong data-piston-focus-piston-status="true">
                            {pistonPhaseLabel[pistonPhase]}
                          </strong>
                        </div>
                        {platformMode === 'press' || pistonPhase === 'rebounding' ? (
                          <div className="studio-heat-focus-panel-row">
                            <span>{interactionCopy.displacementLabel}</span>
                            <strong>{Math.abs(pistonOffsetMm).toFixed(1)} mm</strong>
                          </div>
                        ) : null}
                        {releaseGapMs !== null ? (
                          <div className="studio-heat-focus-panel-row">
                            <span>{interactionCopy.releaseGapLabel}</span>
                            <strong data-piston-focus-release-gap="true">
                              {Math.round(releaseGapMs)} ms
                            </strong>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="studio-heat-focus-panel-row">
                        <span>{interactionCopy.hoseLabel}</span>
                        <strong data-piston-focus-hose-status="true">{hoseInteractionState}</strong>
                      </div>
                    )}
                  </div>
                  <div className="studio-heat-focus-hint">
                    {transitionActive
                      ? interactionCopy.switchingView
                      : heightStageActionVisible && (!spaceHeld || mouseHeld)
                        ? interactionCopy.supportBeforeMirror
                        : interactionCopy.focusLocked}
                  </div>
                  <div className={`studio-heat-focus-panel-actions ${
                    heightStageActionVisible ? '' : 'studio-heat-focus-panel-actions-single'
                  }`.trim()}>
                    {heightStageActionVisible ? (
                      <button
                        type="button"
                        data-piston-height-stage-action="true"
                        data-piston-guide-target="height-stage-action"
                        className={
                          guideVisualCue === 'heightStageAction'
                            ? 'is-guide-highlighted'
                            : undefined
                        }
                        onClick={() => {
                          if (!heightStageActionEnabled) return;
                          if (!attemptGuideAction('confirmHeight')) return;
                          const nextStage = heightAdjustmentStage === 'readingHeight'
                            ? 'lockingHeight'
                            : 'readingHeight';
                          setHeightAdjustmentStage(nextStage);
                          if (nextStage === 'lockingHeight') {
                            onGuideHeightConfirmed?.({
                              focusMode: mode,
                              hoseState,
                              hoseDragging,
                              equilibriumHeightMm: pistonEquilibriumHeightMmRef.current,
                              pistonOffsetMm: pistonOffsetMmRef.current,
                              lockingScrewProgress: lockingScrewProgressRef.current,
                              lockingScrewState: getPistonLockingScrewClampState(
                                lockingScrewProgressRef.current,
                              ),
                              heightAdjustmentStage: nextStage,
                              spaceHeld: spaceHeldRef.current,
                              mouseHeld: mouseHeldRef.current,
                              pistonPhase,
                            });
                          }
                        }}
                        disabled={!heightStageActionEnabled}
                        aria-disabled={!heightStageActionEnabled}
                      >
                        {heightAdjustmentStage === 'readingHeight'
                          ? interactionCopy.confirmHeight
                          : interactionCopy.returnScale}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-piston-focus-exit="true"
                      onClick={() => {
                        if (!demoActive && !guideInteractionPaused) enterOverview();
                      }}
                      disabled={transitionActive || demoActive || guideInteractionPaused}
                    >
                      {interactionCopy.exitFocus}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {overlayCenter || demoFeedbackMessage ? (
          <div
            className={`studio-preview-overlay-center piston-focus-interaction-viewport-feedback-layer ${overlayCenterAboveGuideMask ? 'studio-preview-overlay-center-above-guide-mask' : ''}`}
            data-preview-overlay-center="true"
            data-piston-viewport-feedback-layer="true"
          >
            {demoFeedbackMessage ? (
              <PromptViewportFeedback
                key={demoFeedbackMessage.id}
                id={demoFeedbackMessage.id}
                kind={demoFeedbackMessage.kind}
                label={PROMPT_FEEDBACK_COPY[language].kindLabels[demoFeedbackMessage.kind]}
                durationMs={demoFeedbackMessage.durationMs}
                dataAttributes={{
                  'data-piston-demo-feedback': 'true',
                  'data-prompt-feedback-source': demoFeedbackMessage.source,
                  'data-prompt-feedback-placement': 'viewport-center',
                  'data-prompt-feedback-owner': 'piston-oscillation',
                }}
              >
                {demoFeedbackMessage.text}
              </PromptViewportFeedback>
            ) : null}
            {overlayCenter}
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
};
