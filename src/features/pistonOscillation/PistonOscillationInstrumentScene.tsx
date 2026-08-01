import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { WorkbenchPistonOscillationCameraPreset } from '../workbench/workbenchState.ts';
import {
  clearPistonOscillationInstrumentModelCache,
  PistonOscillationInstrumentAsset,
  PistonOscillationInstrumentModel,
} from './PistonOscillationInstrumentModel.tsx';
import {
  createPistonOscillationCameraPose,
  PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES,
  type PistonOscillationCameraPose,
  type PistonOscillationModelBounds,
} from './pistonOscillationCameraViews.ts';
import {
  isPistonOscillationCameraCaptureEnabled,
  PistonOscillationCameraCaptureBridge,
  PistonOscillationCameraCapturePanel,
  type PistonOscillationCameraCaptureHandler,
  type PistonOscillationCameraViewCapturePayload,
} from './PistonOscillationCameraCaptureTool.tsx';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { getPistonOscillationShellCopy } from './pistonOscillationCopy.ts';
import './PistonOscillationPlaceholders.css';

const PISTON_OSCILLATION_VIEW_RESET_DURATION_MS = 360;

class PistonOscillationSceneErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: unknown) => void;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Piston-oscillation 3D scene failed.', error);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const applyCameraPose = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl,
  pose: PistonOscillationCameraPose,
) => {
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.near = 0.002;
  camera.far = 20;
  camera.updateProjectionMatrix();
  controls.target.set(...pose.target);
  controls.update();
};

interface CameraTransition {
  startedAtMs: number;
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  fromFov: number;
  toPose: PistonOscillationCameraPose;
}

const PistonOscillationCameraRig = ({
  bounds,
  cameraPreset,
  resetRevision,
  controlsRef,
  onTransitionActiveChange,
}: {
  bounds: PistonOscillationModelBounds | null;
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  resetRevision: number;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  onTransitionActiveChange: (active: boolean) => void;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const transitionRef = useRef<CameraTransition | null>(null);
  const appliedPoseRef = useRef<string | null>(null);
  const handledResetRevisionRef = useRef(resetRevision);
  const pose = useMemo(
    () => bounds
      ? createPistonOscillationCameraPose(cameraPreset, bounds, size.width / Math.max(1, size.height))
      : null,
    [bounds, cameraPreset, size.height, size.width],
  );
  const poseIdentity = bounds
    ? `${cameraPreset}:${bounds.center.join(':')}:${bounds.span}:${pose?.fov}`
    : null;

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!pose || !poseIdentity || !(camera instanceof THREE.PerspectiveCamera) || !controls) return;
    if (appliedPoseRef.current === poseIdentity) return;
    transitionRef.current = null;
    onTransitionActiveChange(false);
    applyCameraPose(camera, controls, pose);
    appliedPoseRef.current = poseIdentity;
    invalidate();
  }, [camera, controlsRef, invalidate, onTransitionActiveChange, pose, poseIdentity]);

  useEffect(() => {
    if (handledResetRevisionRef.current === resetRevision) return;
    handledResetRevisionRef.current = resetRevision;
    const controls = controlsRef.current;
    if (!pose || !(camera instanceof THREE.PerspectiveCamera) || !controls) return;
    onTransitionActiveChange(true);
    transitionRef.current = {
      startedAtMs: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPose: pose,
    };
    invalidate();
  }, [camera, controlsRef, invalidate, onTransitionActiveChange, pose, resetRevision]);

  useFrame(() => {
    const transition = transitionRef.current;
    const controls = controlsRef.current;
    if (!transition || !(camera instanceof THREE.PerspectiveCamera) || !controls) return;
    const elapsedMs = Math.max(0, performance.now() - transition.startedAtMs);
    const progress = Math.min(1, elapsedMs / PISTON_OSCILLATION_VIEW_RESET_DURATION_MS);
    const easedProgress = 1 - ((1 - progress) ** 3);
    const targetPosition = new THREE.Vector3(...transition.toPose.position);
    const targetOrbitPoint = new THREE.Vector3(...transition.toPose.target);

    camera.position.lerpVectors(transition.fromPosition, targetPosition, easedProgress);
    controls.target.lerpVectors(transition.fromTarget, targetOrbitPoint, easedProgress);
    camera.fov = THREE.MathUtils.lerp(
      transition.fromFov,
      transition.toPose.fov,
      easedProgress,
    );
    camera.updateProjectionMatrix();
    controls.update();

    if (progress >= 1) {
      transitionRef.current = null;
      applyCameraPose(camera, controls, transition.toPose);
      onTransitionActiveChange(false);
      return;
    }
    invalidate();
  });

  return null;
};

const PistonOscillationOrbitControls = ({
  bounds,
  controlsRef,
  enabled,
}: {
  bounds: PistonOscillationModelBounds | null;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  enabled: boolean;
}) => {
  const invalidate = useThree((state) => state.invalidate);
  const span = bounds?.span ?? 1;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enablePan
      enableRotate
      enableZoom
      minDistance={Math.max(0.05, span * 0.12)}
      maxDistance={Math.max(2, span * 8)}
      onChange={() => invalidate()}
    />
  );
};

export interface PistonOscillationInstrumentSceneProps {
  language: PistonOscillationLanguage;
  sceneTheme: 'light' | 'dark';
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  className?: string;
}

export const PistonOscillationInstrumentScene = ({
  language,
  sceneTheme,
  cameraPreset,
  className = '',
}: PistonOscillationInstrumentSceneProps) => {
  const copy = getPistonOscillationShellCopy(language);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [modelBounds, setModelBounds] = useState<PistonOscillationModelBounds | null>(null);
  const [sceneError, setSceneError] = useState<unknown>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const [cameraTransitionActive, setCameraTransitionActive] = useState(false);
  const [cameraCaptureHandler, setCameraCaptureHandler] =
    useState<PistonOscillationCameraCaptureHandler | null>(null);
  const [cameraCapturePayload, setCameraCapturePayload] =
    useState<PistonOscillationCameraViewCapturePayload | null>(null);
  const cameraCaptureEnabled = useMemo(
    () => isPistonOscillationCameraCaptureEnabled(),
    [],
  );
  const modelReady = modelBounds !== null && sceneError === null;
  const background = sceneTheme === 'light' ? '#e8edf1' : '#242a31';
  const keyLightColor = sceneTheme === 'light' ? '#fffdf7' : '#ffffff';

  const handleBoundsReady = useCallback((bounds: PistonOscillationModelBounds) => {
    setModelBounds((current) => current ?? bounds);
  }, []);

  const handleSceneError = useCallback((error: unknown) => {
    clearPistonOscillationInstrumentModelCache();
    setCameraTransitionActive(false);
    setSceneError(error);
  }, []);

  const captureCurrentCameraView = useCallback(() => {
    const payload = cameraCaptureHandler?.() ?? null;
    if (payload) setCameraCapturePayload(payload);
    return payload;
  }, [cameraCaptureHandler]);

  return (
    <section
      className={`piston-oscillation-instrument-scene ${className}`.trim()}
      data-piston-oscillation-instrument-scene="true"
      data-piston-oscillation-camera-preset={cameraPreset}
      aria-label={copy.preview.ariaLabel}
    >
      <PistonOscillationSceneErrorBoundary onError={handleSceneError}>
        <Canvas
          camera={{ position: [1.05, -1.45, 0.76], fov: 38, near: 0.002, far: 20 }}
          dpr={[1, 1.5]}
          frameloop="demand"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
          }}
        >
          <color attach="background" args={[background]} />
          <hemisphereLight
            color={sceneTheme === 'light' ? '#ffffff' : '#f8fbff'}
            groundColor={sceneTheme === 'light' ? '#7b8791' : '#202832'}
            intensity={sceneTheme === 'light' ? 2.2 : 2}
          />
          <directionalLight
            color={keyLightColor}
            intensity={sceneTheme === 'light' ? 2.1 : 2.6}
            position={[-1, -1.5, 2.2]}
          />
          <directionalLight
            color={sceneTheme === 'light' ? '#bfd6e6' : '#bfd7ff'}
            intensity={1.2}
            position={[1.2, 1, 1.4]}
          />
          <Suspense fallback={null}>
            <PistonOscillationInstrumentAsset>
              {(sourceScene, unifiedLightLabBenchSourceScene) => (
                <PistonOscillationInstrumentModel
                  sourceScene={sourceScene}
                  unifiedLightLabBenchSourceScene={unifiedLightLabBenchSourceScene}
                  onBoundsReady={handleBoundsReady}
                />
              )}
            </PistonOscillationInstrumentAsset>
          </Suspense>
          <PistonOscillationOrbitControls
            bounds={modelBounds}
            controlsRef={controlsRef}
            enabled={!cameraTransitionActive}
          />
          <PistonOscillationCameraRig
            bounds={modelBounds}
            cameraPreset={cameraPreset}
            resetRevision={resetRevision}
            controlsRef={controlsRef}
            onTransitionActiveChange={setCameraTransitionActive}
          />
          <PistonOscillationCameraCaptureBridge
            enabled={cameraCaptureEnabled && modelReady}
            controlsRef={controlsRef}
            cameraPreset={cameraPreset}
            bounds={modelBounds}
            baseFov={PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES[cameraPreset].fov}
            onCaptureHandlerChange={setCameraCaptureHandler}
          />
        </Canvas>
      </PistonOscillationSceneErrorBoundary>

      {!sceneError ? (
        <PistonOscillationCameraCapturePanel
          enabled={cameraCaptureEnabled}
          payload={cameraCapturePayload}
          captureReady={Boolean(cameraCaptureHandler)}
          onCapture={captureCurrentCameraView}
        />
      ) : null}

      {!modelReady ? (
        <div
          className={`piston-oscillation-scene-status ${
            sceneError ? 'piston-oscillation-scene-status-error' : ''
          }`.trim()}
          role={sceneError ? 'alert' : 'status'}
        >
          <strong>
            {sceneError ? copy.preview.loadErrorTitle : copy.preview.loadingTitle}
          </strong>
          <span>
            {sceneError ? copy.preview.loadErrorBody : copy.preview.loadingBody}
          </span>
        </div>
      ) : null}

      <div
        className="studio-preview-overlay-layer"
        data-preview-overlay-layer="piston-oscillation"
      >
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-right">
          <button
            type="button"
            className="studio-heat-view-reset"
            data-piston-oscillation-view-reset="true"
            data-preview-overlay-item="piston-view-reset"
            disabled={!modelReady || cameraTransitionActive}
            onClick={() => setResetRevision((revision) => revision + 1)}
          >
            {copy.preview.restoreDefaultView}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PistonOscillationInstrumentScene;
