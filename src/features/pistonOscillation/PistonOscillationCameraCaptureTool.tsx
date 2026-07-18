import React, { useCallback, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { WorkbenchPistonOscillationCameraPreset } from '../workbench/workbenchState.ts';
import type { PistonOscillationModelBounds } from './pistonOscillationCameraViews.ts';

export const PISTON_OSCILLATION_CAMERA_CAPTURE_QUERY_PARAM = 'cameraCapture';
export const PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY =
  'hsl_piston_oscillation_camera_capture_latest';
export const PISTON_OSCILLATION_CAMERA_CAPTURE_EVENT =
  'hsl:piston-oscillation-camera-capture';

type CameraCaptureTuple = [number, number, number];

export interface PistonOscillationCameraViewCapturePayload {
  capturedAt: string;
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  viewport: {
    width: number;
    height: number;
  };
  aspect: number;
  bounds: PistonOscillationModelBounds;
  position: CameraCaptureTuple;
  target: CameraCaptureTuple;
  direction: CameraCaptureTuple;
  targetOffset: CameraCaptureTuple;
  fov: number;
  actualFov: number;
  schemeSnippet: string;
}

export type PistonOscillationCameraCaptureHandler =
  () => PistonOscillationCameraViewCapturePayload | null;

const roundCameraCaptureNumber = (value: number) => Number(value.toFixed(3));

const vectorToCameraCaptureTuple = (value: THREE.Vector3): CameraCaptureTuple => [
  roundCameraCaptureNumber(value.x),
  roundCameraCaptureNumber(value.y),
  roundCameraCaptureNumber(value.z),
];

const valuesToCameraCaptureTuple = (
  values: readonly [number, number, number],
): CameraCaptureTuple => [
  roundCameraCaptureNumber(values[0]),
  roundCameraCaptureNumber(values[1]),
  roundCameraCaptureNumber(values[2]),
];

const createCameraCaptureSchemeSnippet = (
  cameraPreset: WorkbenchPistonOscillationCameraPreset,
  direction: CameraCaptureTuple,
  targetOffset: CameraCaptureTuple,
  fov: number,
) => (
  `${cameraPreset}: {\n` +
  `  direction: [${direction.join(', ')}],\n` +
  `  targetOffset: [${targetOffset.join(', ')}],\n` +
  `  fov: ${fov},\n` +
  `},`
);

export const isPistonOscillationCameraCaptureEnabled = () => (
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search)
    .get(PISTON_OSCILLATION_CAMERA_CAPTURE_QUERY_PARAM) === '1'
);

export function PistonOscillationCameraCaptureBridge({
  enabled,
  controlsRef,
  cameraPreset,
  bounds,
  baseFov,
  onCaptureHandlerChange,
}: {
  enabled: boolean;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  bounds: PistonOscillationModelBounds | null;
  baseFov: number;
  onCaptureHandlerChange: React.Dispatch<
    React.SetStateAction<PistonOscillationCameraCaptureHandler | null>
  >;
}) {
  const { camera, size } = useThree();
  const captureCameraView = useCallback(() => {
    if (
      !enabled ||
      !bounds ||
      !(camera instanceof THREE.PerspectiveCamera) ||
      !controlsRef.current
    ) {
      return null;
    }

    const target = controlsRef.current.target;
    const position = vectorToCameraCaptureTuple(camera.position);
    const targetTuple = vectorToCameraCaptureTuple(target);
    const span = Number.isFinite(bounds.span) && bounds.span > 0 ? bounds.span : 1;
    const direction = valuesToCameraCaptureTuple([
      (camera.position.x - bounds.center[0]) / span,
      (camera.position.y - bounds.center[1]) / span,
      (camera.position.z - bounds.center[2]) / span,
    ]);
    const targetOffset = valuesToCameraCaptureTuple([
      target.x - bounds.center[0],
      target.y - bounds.center[1],
      target.z - bounds.center[2],
    ]);
    const fov = roundCameraCaptureNumber(baseFov);
    const actualFov = roundCameraCaptureNumber(camera.fov);
    const payload: PistonOscillationCameraViewCapturePayload = {
      capturedAt: new Date().toISOString(),
      cameraPreset,
      viewport: {
        width: Math.round(size.width),
        height: Math.round(size.height),
      },
      aspect: roundCameraCaptureNumber(size.width / Math.max(1, size.height)),
      bounds: {
        center: valuesToCameraCaptureTuple(bounds.center),
        span: roundCameraCaptureNumber(span),
      },
      position,
      target: targetTuple,
      direction,
      targetOffset,
      fov,
      actualFov,
      schemeSnippet: createCameraCaptureSchemeSnippet(
        cameraPreset,
        direction,
        targetOffset,
        fov,
      ),
    };

    window.localStorage.setItem(
      PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY,
      JSON.stringify(payload),
    );
    window.dispatchEvent(
      new CustomEvent(PISTON_OSCILLATION_CAMERA_CAPTURE_EVENT, { detail: payload }),
    );
    console.info('[Piston Oscillation camera capture]', payload.schemeSnippet, payload);
    return payload;
  }, [
    baseFov,
    bounds,
    camera,
    cameraPreset,
    controlsRef,
    enabled,
    size.height,
    size.width,
  ]);

  useEffect(() => {
    if (!enabled) {
      onCaptureHandlerChange(null);
      return undefined;
    }
    onCaptureHandlerChange(() => captureCameraView);
    return () => onCaptureHandlerChange(null);
  }, [captureCameraView, enabled, onCaptureHandlerChange]);

  return null;
}

export function PistonOscillationCameraCapturePanel({
  enabled,
  payload,
  captureReady,
  onCapture,
}: {
  enabled: boolean;
  payload: PistonOscillationCameraViewCapturePayload | null;
  captureReady: boolean;
  onCapture: () => PistonOscillationCameraViewCapturePayload | null;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const outputText = payload
    ? JSON.stringify(payload, null, 2)
    : `拖动模型并调整到满意视角，然后记录。最近一次记录会保存到 ${PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY}。`;
  const handleCopy = useCallback(async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.schemeSnippet);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [payload]);

  if (!enabled) return null;

  return (
    <section
      className="studio-heat-camera-capture-panel"
      data-piston-oscillation-camera-capture="true"
    >
      <div className="studio-heat-camera-capture-header">
        <strong>活塞视角采集中台</strong>
        <span>临时工具 / 5184</span>
      </div>
      <div className="studio-heat-camera-capture-actions">
        <button
          type="button"
          data-piston-oscillation-camera-capture-action="record"
          disabled={!captureReady}
          onClick={() => {
            setCopyState('idle');
            onCapture();
          }}
        >
          记录当前视角
        </button>
        <button
          type="button"
          data-piston-oscillation-camera-capture-action="copy"
          disabled={!payload}
          onClick={() => {
            void handleCopy();
          }}
        >
          复制默认片段
        </button>
      </div>
      <pre className="studio-heat-camera-capture-output">{outputText}</pre>
      <small>
        {copyState === 'copied'
          ? '已复制可直接写回源码的 scheme 片段。'
          : copyState === 'failed'
            ? '复制失败；可直接复制上方内容。'
            : `localStorage: ${PISTON_OSCILLATION_CAMERA_CAPTURE_STORAGE_KEY}`}
      </small>
    </section>
  );
}
