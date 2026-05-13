import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_OPEN_MAGNET_DEG,
  HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG,
  getHeatCapacityStopcockState,
  normalizeHeatCapacityStopcockAngle,
} from '../workbenchState';

interface HeatCapacityInstrumentSceneProps {
  powerOn: boolean;
  stopcockAngleDeg: number;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pressureRawPlaceholder: number;
  pressureDisplayedPlaceholder: number;
  pressureGaugeDisplayValue: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureSafetyThresholdKPa: number;
  pressureOverLimit: boolean;
  pressureZeroAdjustMode: 'none' | 'fineWheel' | 'coarseDrag';
  pressureKPa: number | null;
  pressureLimitKPa: number;
  pumpValveOpen: boolean;
  pumpValveState: 'open' | 'closed';
  pumpBulbState: 'idle' | 'compressing' | 'releasing';
  pumpPulseId: number;
  pumpFrequency: number;
  pumpFrequencyStatus: 'idle' | 'tooSlow' | 'suitable';
  performanceMode: 'standard' | 'performance';
  pumpHint: string;
  pressurePlaceholder: number;
  temperaturePlaceholder: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  interactionLocked: boolean;
  demoFocusControlId: string | null;
  demoFocusPulseActive: boolean;
  focusResetKey: number;
  onFocusModeChange: (mode: HeatCapacityFocusMode) => void;
  onLockedInteraction: (message?: string) => void;
  onPowerToggle: (nextPowerOn: boolean) => void;
  onStopcockAngleChange: (nextAngleDeg: number) => void;
  onPressureZero: () => void;
  onPressureZeroFineAdjust: (direction: number) => void;
  onPressureZeroCoarseAdjust: (angleDeltaDeg: number) => void;
  onPumpValveToggle: () => void;
  onPumpBulbPress: () => void;
}

type HeatCapacityFocusMode = 'none' | 'stopcock' | 'instrument' | 'pump';
type HeatCapacityHoveredControl = null | 'stopcock' | 'pumpBulb' | 'pumpValve' | 'powerSwitch' | 'pressureZero';

const STOPCOCK_WHEEL_STEP_DEG = 3;
const PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 2;
const PRESSURE_ZERO_DRAG_DIRECTION = -1;
const HOVER_CLEAR_DELAY_MS = 220;
const PANEL_TEXT_STANDARD_UPDATE_MS = 250;
const PANEL_TEXT_PERFORMANCE_UPDATE_MS = 500;
const PANEL_TEXT_INTERACTION_UPDATE_MS = 1000;
const GAUGE_NEEDLE_SETTLE_EPSILON = 0.0035;
const HEAT_CAPACITY_STANDARD_DPR: [number, number] = [1, 1.15];
const HEAT_CAPACITY_PERFORMANCE_DPR: [number, number] = [1, 1];
const NON_BULB_HOVER_EMISSIVE_INTENSITY = 0.26;
const NON_BULB_HOVER_HALO_OPACITY = 0.22;
const GLASS_HOVER_EMISSIVE_INTENSITY = 0.18;
const GLASS_HOVER_HALO_OPACITY = 0.16;
const PUMP_VALVE_TRANSITION_MS = 420;
const DISABLE_RAYCAST: THREE.Object3D['raycast'] = () => undefined;
const DEFAULT_CAMERA_POSITION: [number, number, number] = [4.15, 2.9, 8.25];
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0.25, -0.05, 0];
const ORBIT_MIN_DISTANCE = 2.7;
const ORBIT_MAX_DISTANCE = 11.5;

const STOPCOCK_OPEN_ANGLES = [
  HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG,
  HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG,
];

const normalizeDisplayAngle = (angleDeg: number) => ((angleDeg % 360) + 360) % 360;

const getCircularAngleDistance = (angleDeg: number, targetDeg: number) => {
  const delta = Math.abs(normalizeDisplayAngle(angleDeg) - normalizeDisplayAngle(targetDeg));
  return Math.min(delta, 360 - delta);
};

const getNearestOpenAngle = (angleDeg: number) => (
  STOPCOCK_OPEN_ANGLES.reduce((nearest, openAngle) => (
    getCircularAngleDistance(angleDeg, openAngle) < getCircularAngleDistance(angleDeg, nearest)
      ? openAngle
      : nearest
  ), STOPCOCK_OPEN_ANGLES[0])
);

const formatStopcockAngle = (angleDeg: number) => `${Math.round(normalizeDisplayAngle(angleDeg))}°`;

const formatSignal = (value: number | null, fallback = '--.- mV') => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)} mV` : fallback
);

const angleToSliderPercent = (angleDeg: number) => `${(normalizeDisplayAngle(angleDeg) / 360) * 100}%`;

const clampPressureZeroSceneKnobAngle = (angleDeg: number) => Math.min(
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  Math.max(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG, angleDeg),
);

const getPressureZeroLimitMessage = (requestedAngleDeg: number) => {
  if (requestedAngleDeg > HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG) return '已到调节上限';
  if (requestedAngleDeg < HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG) return '已到调节下限';
  return null;
};

const getPumpBulbDisplayLabel = (pumpBulbState: HeatCapacityInstrumentSceneProps['pumpBulbState']) => (
  pumpBulbState === 'idle' ? '待机' : '打气中'
);

const getPumpFrequencyStatusLabel = (status: HeatCapacityInstrumentSceneProps['pumpFrequencyStatus']) => (
  status === 'idle' ? '空闲' : status === 'tooSlow' ? '打气过慢' : '打气频率合适'
);

const getHeatCapacityInteractionHints = (focusMode: HeatCapacityFocusMode) => {
  if (focusMode === 'stopcock') {
    return [
      '聚焦模式：整体视角已锁定',
      '拖动旋塞手柄或悬停滚轮微调角度',
      '点击打气阀门切换通路，滑条可精确调节',
      '点击退出聚焦返回默认视角',
    ];
  }
  if (focusMode === 'pump') {
    return [
      '聚焦模式：点击打气球执行打气',
      '右下角面板显示阀门状态和打气频率',
      '点击退出聚焦返回默认视角',
    ];
  }
  if (focusMode === 'instrument') {
    return [
      '聚焦模式：整体视角已锁定',
      '查看仪表读数、电源状态和占位数据',
      '点击退出聚焦返回默认视角',
    ];
  }
  return [
    '左键拖动：旋转模型',
    '右键拖动：平移模型',
    '滚轮：缩放模型',
    '双击高亮部件：进入聚焦',
    '悬停高亮表示可交互',
  ];
};

const getHeatCapacityHoverTooltip = (
  hoveredControl: HeatCapacityHoveredControl,
  pumpValveOpen: boolean,
) => {
  if (hoveredControl === 'stopcock') return '玻璃旋塞：滚轮微调角度；双击进入聚焦';
  if (hoveredControl === 'pumpValve') return '打气阀门：点击切换开闭状态';
  if (hoveredControl === 'pumpBulb') return pumpValveOpen ? '打气球：聚焦后点击打气' : '打气球：需先打开打气阀门';
  if (hoveredControl === 'powerSwitch') return '电源开关：点击开关电源';
  if (hoveredControl === 'pressureZero') return '压力调零旋钮：拖拽粗调 / 滚轮精调';
  return null;
};

const formatPanelNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const PRESSURE_GAUGE_MIN_ROTATION = -2.15;
const PRESSURE_GAUGE_MAX_ROTATION = 2.15;
const PRESSURE_GAUGE_TICKS = [-2.15, -1.43, -0.72, 0, 0.72, 1.43, 2.15];
const PRESSURE_GAUGE_DANGER_MARKERS = Array.from({ length: 7 }, (_, index) => index);

const clampSceneNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const mapPressureGaugeValueToRotation = (
  pressureKPa: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
) => {
  const pressureRange = Math.max(0.001, gaugePressureMaxKPa - gaugePressureMinKPa);
  const clampedPressure = clampSceneNumber(pressureKPa, gaugePressureMinKPa, gaugePressureMaxKPa);
  const fraction = (clampedPressure - gaugePressureMinKPa) / pressureRange;
  return PRESSURE_GAUGE_MIN_ROTATION + fraction * (PRESSURE_GAUGE_MAX_ROTATION - PRESSURE_GAUGE_MIN_ROTATION);
};

const getPressureGaugeNeedleRotation = (
  pressureGaugeDisplayValue: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
  powerOn: boolean,
) => {
  if (!powerOn || typeof pressureGaugeDisplayValue !== 'number' || !Number.isFinite(pressureGaugeDisplayValue)) {
    return PRESSURE_GAUGE_MIN_ROTATION;
  }
  return mapPressureGaugeValueToRotation(pressureGaugeDisplayValue, gaugePressureMinKPa, gaugePressureMaxKPa);
};

function PanelText({
  name,
  position,
  children,
  size = 0.045,
  color = '#0f172a',
  updateIntervalMs = 0,
}: {
  name: string;
  position: [number, number, number];
  children: string;
  size?: number;
  color?: string;
  updateIntervalMs?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawRef = useRef(0);
  const pendingTimerRef = useRef<number | null>(null);
  const latestTextRef = useRef(children);
  const latestStyleRef = useRef({ color, size });
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    canvasRef.current = canvas;
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    return canvasTexture;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  useEffect(() => {
    latestTextRef.current = children;
    latestStyleRef.current = { color, size };

    const drawTexture = () => {
      pendingTimerRef.current = null;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const latestStyle = latestStyleRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = latestStyle.color;
      context.font = `700 ${Math.max(24, Math.round(latestStyle.size * 900))}px Consolas, monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(latestTextRef.current, canvas.width / 2, canvas.height / 2);
      texture.needsUpdate = true;
      lastDrawRef.current = window.performance.now();
      invalidate();
    };

    if (updateIntervalMs <= 0) {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      drawTexture();
      return undefined;
    }

    const elapsedMs = window.performance.now() - lastDrawRef.current;
    if (elapsedMs >= updateIntervalMs) {
      drawTexture();
      return undefined;
    }

    if (pendingTimerRef.current === null) {
      pendingTimerRef.current = window.setTimeout(drawTexture, updateIntervalMs - elapsedMs);
    }

    return undefined;
  }, [children, color, invalidate, size, texture, updateIntervalMs]);

  useEffect(() => () => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  return (
    <mesh
      name={name}
      position={position}
    >
      <planeGeometry args={[0.46, 0.115]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function PanelTerminal({
  name,
  position,
  color,
  radius = 0.04,
}: {
  name: string;
  position: [number, number, number];
  color: string;
  radius?: number;
}) {
  return (
    <mesh name={name} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, 0.035, 24]} />
      <meshStandardMaterial color={color} roughness={0.38} metalness={color === '#c7d0dc' ? 0.45 : 0.08} />
    </mesh>
  );
}

function DemoFocusHalo({
  active,
  suspended = false,
  name = 'DemoFocusHalo',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  children,
}: {
  active: boolean;
  suspended?: boolean;
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children: React.ReactNode;
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame(({ clock }) => {
    if (!active || suspended) return;
    if (!meshRef.current || !materialRef.current) return;
    const pulse = (Math.sin(clock.elapsedTime * Math.PI * 1.5) + 1) / 2;
    const scale = 1.06 + pulse * 0.14;
    meshRef.current.scale.setScalar(scale);
    materialRef.current.opacity = 0.24 + pulse * 0.28;
  });

  if (!active) return null;

  return (
    <mesh name={name} ref={meshRef} position={position} rotation={rotation} raycast={DISABLE_RAYCAST}>
      {children}
      <meshBasicMaterial
        ref={materialRef}
        color="#bae6fd"
        transparent
        opacity={0.3}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function InstrumentBox({
  powerOn,
  pressureZeroKnobAngle,
  pressureGaugeDisplayValue,
  gaugePressureMinKPa,
  gaugePressureMaxKPa,
  pressureSafetyThresholdKPa,
  pressureOverLimit,
  temperatureSignalMv,
  pressureSignalMv,
  onPowerToggle,
  onPressureZero,
  onPressureZeroFineAdjust,
  onPressureZeroCoarseAdjust,
  zeroEnabled,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  onLockedInteraction,
  performanceMode,
  interactionQualityReduced,
}: Pick<HeatCapacityInstrumentSceneProps, 'powerOn' | 'pressureZeroKnobAngle' | 'pressureGaugeDisplayValue' | 'gaugePressureMinKPa' | 'gaugePressureMaxKPa' | 'pressureSafetyThresholdKPa' | 'pressureOverLimit' | 'temperatureSignalMv' | 'pressureSignalMv' | 'onPowerToggle' | 'onPressureZero' | 'onPressureZeroFineAdjust' | 'onPressureZeroCoarseAdjust' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'onLockedInteraction'> & {
  zeroEnabled: boolean;
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  performanceMode: HeatCapacityInstrumentSceneProps['performanceMode'];
  interactionQualityReduced: boolean;
}) {
  const temperatureText = powerOn ? formatSignal(temperatureSignalMv) : '';
  const pressureText = powerOn ? formatSignal(pressureSignalMv) : '';
  const screenColor = powerOn ? '#34d5ff' : '#1d3144';
  const screenGlow = powerOn ? '#8eeaff' : '#203345';
  const powerSwitchHovered = hoveredControl === 'powerSwitch';
  const pressureZeroHovered = hoveredControl === 'pressureZero';
  const pressureZeroInteractionEnabled = focusMode === 'instrument';
  const powerSwitchDemoFocused = demoFocusPulseActive && demoFocusControlId === 'powerSwitch';
  const pressureZeroDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pressureZero';
  const pressureDisplayDemoFocused = demoFocusPulseActive && (
    demoFocusControlId === 'instrumentPressureDisplay' ||
    demoFocusControlId === 'instrumentPanel'
  );
  const temperatureDisplayDemoFocused = demoFocusPulseActive && (
    demoFocusControlId === 'instrumentTemperatureDisplay' ||
    demoFocusControlId === 'instrumentPanel'
  );
  const { camera, gl, invalidate } = useThree();
  const gaugeNeedlePivotRef = useRef<THREE.Group | null>(null);
  const pressureZeroKnobRef = useRef<THREE.Group | null>(null);
  const pressureZeroDragRef = useRef({
    startKnobAngle: pressureZeroKnobAngle,
    lastPointerAngle: 0,
    totalDelta: 0,
    lastAppliedKnobAngle: pressureZeroKnobAngle,
    moved: false,
  });
  const gaugeNeedleTargetRotation = getPressureGaugeNeedleRotation(
    pressureGaugeDisplayValue,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
    powerOn,
  );
  const gaugeSafetyRotation = mapPressureGaugeValueToRotation(
    pressureSafetyThresholdKPa,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
  );
  const gaugeDisplayedRotationRef = useRef(gaugeNeedleTargetRotation);
  const gaugeNeedleTargetRotationRef = useRef(gaugeNeedleTargetRotation);
  const panelTextUpdateIntervalMs = interactionQualityReduced
    ? PANEL_TEXT_INTERACTION_UPDATE_MS
    : performanceMode === 'performance'
      ? PANEL_TEXT_PERFORMANCE_UPDATE_MS
      : PANEL_TEXT_STANDARD_UPDATE_MS;

  useEffect(() => {
    gaugeNeedleTargetRotationRef.current = gaugeNeedleTargetRotation;
    invalidate();
  }, [gaugeNeedleTargetRotation, invalidate]);

  useFrame((_, delta) => {
    if (interactionQualityReduced) return;
    const targetRotation = gaugeNeedleTargetRotationRef.current;
    const currentRotation = gaugeDisplayedRotationRef.current;
    const rotationDelta = Math.abs(targetRotation - currentRotation);
    if (rotationDelta <= GAUGE_NEEDLE_SETTLE_EPSILON) {
      if (gaugeNeedlePivotRef.current) {
        gaugeNeedlePivotRef.current.rotation.z = targetRotation;
      }
      gaugeDisplayedRotationRef.current = targetRotation;
      return;
    }
    const smoothing = 1 - Math.exp(-(pressureOverLimit ? 12 : 9) * delta);
    gaugeDisplayedRotationRef.current = clampSceneNumber(
      THREE.MathUtils.lerp(currentRotation, targetRotation, smoothing),
      PRESSURE_GAUGE_MIN_ROTATION,
      PRESSURE_GAUGE_MAX_ROTATION,
    );
    if (gaugeNeedlePivotRef.current) {
      gaugeNeedlePivotRef.current.rotation.z = gaugeDisplayedRotationRef.current;
    }
    invalidate();
  });

  const getPressureZeroPointerAngle = useCallback((clientX: number, clientY: number) => {
    if (!pressureZeroKnobRef.current) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const center = new THREE.Vector3();
    pressureZeroKnobRef.current.getWorldPosition(center);
    center.project(camera);
    const centerX = rect.left + ((center.x + 1) / 2) * rect.width;
    const centerY = rect.top + ((1 - center.y) / 2) * rect.height;
    return THREE.MathUtils.radToDeg(Math.atan2(clientY - centerY, clientX - centerX));
  }, [camera, gl]);

  const getSignedAngleDelta = (nextAngle: number, startAngle: number) => {
    const delta = ((nextAngle - startAngle + 540) % 360) - 180;
    return Number.isFinite(delta) ? delta : 0;
  };

  const handlePressureZeroWheel = (event: ThreeEvent<WheelEvent>) => {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const requestedDelta = (event.deltaY < 0 ? PRESSURE_ZERO_FINE_ANGLE_STEP_DEG : -PRESSURE_ZERO_FINE_ANGLE_STEP_DEG) * PRESSURE_ZERO_DRAG_DIRECTION;
    const requestedKnobAngle = pressureZeroKnobAngle + requestedDelta;
    const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
    const boundedDelta = nextKnobAngle - pressureZeroKnobAngle;
    if (Math.abs(boundedDelta) < 0.01) {
      const limitMessage = getPressureZeroLimitMessage(requestedKnobAngle);
      if (limitMessage) onLockedInteraction(limitMessage);
      return;
    }
    onPressureZeroFineAdjust(boundedDelta);
  };

  const startPressureZeroDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const pointerAngle = getPressureZeroPointerAngle(event.clientX, event.clientY);
    if (pointerAngle === null) return;
    pressureZeroDragRef.current = {
      startKnobAngle: pressureZeroKnobAngle,
      lastPointerAngle: pointerAngle,
      totalDelta: 0,
      lastAppliedKnobAngle: pressureZeroKnobAngle,
      moved: false,
    };
    const pointerId = event.pointerId;
    gl.domElement.setPointerCapture?.(pointerId);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPointerAngle = getPressureZeroPointerAngle(moveEvent.clientX, moveEvent.clientY);
      if (nextPointerAngle === null) return;
      const dragState = pressureZeroDragRef.current;
      const pointerDelta = getSignedAngleDelta(nextPointerAngle, dragState.lastPointerAngle);
      dragState.lastPointerAngle = nextPointerAngle;
      dragState.totalDelta += pointerDelta * PRESSURE_ZERO_DRAG_DIRECTION;
      const requestedKnobAngle = dragState.startKnobAngle + dragState.totalDelta;
      const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
      const incrementalDelta = nextKnobAngle - dragState.lastAppliedKnobAngle;
      if (Math.abs(incrementalDelta) < 0.15) {
        const limitMessage = getPressureZeroLimitMessage(requestedKnobAngle);
        if (limitMessage) onLockedInteraction(limitMessage);
        return;
      }
      dragState.lastAppliedKnobAngle = nextKnobAngle;
      dragState.moved = true;
      onPressureZeroCoarseAdjust(incrementalDelta);
    };
    const handlePointerUp = () => {
      gl.domElement.releasePointerCapture?.(pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <group
      name="InstrumentBoxRoot"
      position={[1.85, -0.5, 0]}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (interactionLocked) {
          onLockedInteraction();
          return;
        }
        onFocus('instrument');
      }}
    >
      <mesh name="InstrumentBox" castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.18, 0.78, 0.86]} />
        <meshStandardMaterial color="#dbe3ec" roughness={0.58} metalness={0.05} />
      </mesh>
      <mesh name="InstrumentBoxFace" position={[0, 0.02, 0.44]}>
        <boxGeometry args={[2.04, 0.6, 0.04]} />
        <meshStandardMaterial color="#c4ced9" roughness={0.7} />
      </mesh>

      <PanelText name="InstrumentPanelTitleText" position={[0, 0.28, 0.505]} size={0.035}>
        FD-NCD-C
      </PanelText>

      <mesh name="TemperatureDisplay" position={[-0.64, 0.1, 0.48]}>
        <boxGeometry args={[0.42, 0.18, 0.035]} />
        <meshStandardMaterial color={screenColor} emissive={screenGlow} emissiveIntensity={powerOn ? 0.55 : 0.05} />
      </mesh>
      <DemoFocusHalo active={temperatureDisplayDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloTemperatureDisplay" position={[-0.64, 0.1, 0.508]}>
        <boxGeometry args={[0.5, 0.24, 0.02]} />
      </DemoFocusHalo>
      <PanelText name="TemperatureDisplayText" position={[-0.64, 0.1, 0.505]} size={0.038} color={powerOn ? '#062638' : '#7f94a8'} updateIntervalMs={panelTextUpdateIntervalMs}>
        {temperatureText || 'U_T'}
      </PanelText>
      <PanelTerminal name="TemperaturePositiveInputTerminal" position={[-0.73, -0.12, 0.49]} color="#dc2626" />
      <PanelTerminal name="TemperatureNegativeInputTerminal" position={[-0.55, -0.12, 0.49]} color="#111827" />
      <PanelText name="TemperatureInputPortLabelText" position={[-0.64, -0.23, 0.505]} size={0.025}>
        INPUT +/-
      </PanelText>

      <mesh name="PressureDisplay" position={[0, 0.1, 0.48]}>
        <boxGeometry args={[0.42, 0.18, 0.035]} />
        <meshStandardMaterial color={screenColor} emissive={screenGlow} emissiveIntensity={powerOn ? 0.55 : 0.05} />
      </mesh>
      <DemoFocusHalo active={pressureDisplayDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPressureDisplay" position={[0, 0.1, 0.508]}>
        <boxGeometry args={[0.5, 0.24, 0.02]} />
      </DemoFocusHalo>
      <PanelText name="PressureDisplayText" position={[0, 0.1, 0.505]} size={0.038} color={powerOn ? '#062638' : '#7f94a8'} updateIntervalMs={panelTextUpdateIntervalMs}>
        {pressureText || 'U_p'}
      </PanelText>
      <PanelTerminal name="PressureSensorInputPort" position={[-0.08, -0.13, 0.49]} color="#c7d0dc" radius={0.055} />
      <PanelText name="PressureInputPortLabelText" position={[-0.08, -0.24, 0.505]} size={0.025}>
        PRESS IN
      </PanelText>

      <group name="AnalogPressureGauge" position={[0.58, 0.05, 0.52]}>
        <mesh name="AnalogPressureGaugeDial" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.035, 32]} />
          <meshStandardMaterial
            color={pressureOverLimit ? '#fee2e2' : '#eef2f6'}
            roughness={0.45}
            emissive={pressureOverLimit ? '#dc2626' : '#000000'}
            emissiveIntensity={pressureOverLimit ? 0.22 : 0}
          />
        </mesh>
        {PRESSURE_GAUGE_TICKS.map((tickRotation) => {
          const tickRadius = 0.135;
          const majorTick = Math.abs(tickRotation) === PRESSURE_GAUGE_MAX_ROTATION || tickRotation === 0;
          return (
            <mesh
              key={tickRotation}
              name="AnalogPressureGaugeTick"
              position={[Math.cos(tickRotation) * tickRadius, Math.sin(tickRotation) * tickRadius, 0.056]}
              rotation={[0, 0, tickRotation]}
            >
              <boxGeometry args={[majorTick ? 0.042 : 0.03, 0.008, 0.01]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          );
        })}
        {PRESSURE_GAUGE_DANGER_MARKERS.map((markerIndex) => {
          const dangerFraction = PRESSURE_GAUGE_DANGER_MARKERS.length <= 1
            ? 1
            : markerIndex / (PRESSURE_GAUGE_DANGER_MARKERS.length - 1);
          const markerRotation = gaugeSafetyRotation + dangerFraction * (PRESSURE_GAUGE_MAX_ROTATION - gaugeSafetyRotation);
          const markerRadius = 0.154;
          return (
            <mesh
              key={markerIndex}
              name="AnalogPressureGaugeDangerMarker"
              position={[Math.cos(markerRotation) * markerRadius, Math.sin(markerRotation) * markerRadius, 0.058]}
              rotation={[0, 0, markerRotation]}
            >
              <boxGeometry args={[0.034, 0.012, 0.012]} />
              <meshStandardMaterial color="#dc2626" emissive="#7f1d1d" emissiveIntensity={pressureOverLimit ? 0.36 : 0.12} />
            </mesh>
          );
        })}
        <group name="AnalogPressureGaugeNeedlePivot" ref={gaugeNeedlePivotRef} rotation={[0, 0, gaugeDisplayedRotationRef.current]}>
          <mesh name="AnalogPressureGaugeNeedle" position={[0.055, 0, 0.062]}>
            <boxGeometry args={[0.14, 0.014, 0.012]} />
            <meshStandardMaterial color={pressureOverLimit ? '#f97316' : powerOn ? '#e11d48' : '#64748b'} emissive={pressureOverLimit ? '#991b1b' : '#000000'} emissiveIntensity={pressureOverLimit ? 0.32 : 0} />
          </mesh>
        </group>
        <mesh name="AnalogPressureGaugeHub" position={[0, 0.004, 0.055]}>
          <sphereGeometry args={[0.018, 12, 10]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>

      <group
        name="PowerSwitch"
        position={[0.98, -0.14, 0.56]}
        onClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onPowerToggle(!powerOn);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('powerSwitch');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="HitboxPowerSwitch">
          <boxGeometry args={[0.34, 0.34, 0.22]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={powerSwitchDemoFocused} name="DemoFocusHaloPowerSwitch" rotation={[powerOn ? -0.35 : 0.35, 0, 0]}>
          <boxGeometry args={[0.22, 0.38, 0.16]} />
        </DemoFocusHalo>
        <mesh rotation={[powerOn ? -0.35 : 0.35, 0, 0]}>
          <boxGeometry args={[0.14, 0.28, 0.12]} />
          <meshStandardMaterial color={powerOn ? '#16a34a' : '#ef4444'} roughness={0.45} emissive={powerSwitchHovered ? '#0e7490' : '#000000'} emissiveIntensity={powerSwitchHovered ? NON_BULB_HOVER_EMISSIVE_INTENSITY : 0} />
        </mesh>
        {powerSwitchHovered ? (
          <mesh name="PowerSwitchHoverHalo" rotation={[powerOn ? -0.35 : 0.35, 0, 0]} raycast={DISABLE_RAYCAST}>
            <boxGeometry args={[0.19, 0.34, 0.15]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={NON_BULB_HOVER_HALO_OPACITY} depthWrite={false} />
          </mesh>
        ) : null}
      </group>

      <group
        name="PressureZeroKnob"
        ref={pressureZeroKnobRef}
        position={[0.22, -0.14, 0.55]}
        onPointerDown={pressureZeroInteractionEnabled ? startPressureZeroDrag : undefined}
        onWheel={pressureZeroInteractionEnabled ? handlePressureZeroWheel : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          if (pressureZeroInteractionEnabled && zeroEnabled && !pressureZeroDragRef.current.moved) onPressureZero();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onFocus('instrument');
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('pressureZero');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="HitboxPressureZeroKnob">
          <boxGeometry args={[0.36, 0.36, 0.22]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pressureZeroDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPressureZero" position={[0, 0, 0.065]}>
          <torusGeometry args={[0.145, 0.011, 8, 32]} />
        </DemoFocusHalo>
        {[-55, -28, 0, 28, 55].map((tickDeg) => {
          const tickRad = THREE.MathUtils.degToRad(tickDeg - 90);
          return (
            <mesh
              key={tickDeg}
              name="PressureZeroScaleTick"
              position={[Math.cos(tickRad) * 0.16, Math.sin(tickRad) * 0.16, 0.052]}
              rotation={[0, 0, tickRad]}
              raycast={DISABLE_RAYCAST}
            >
              <boxGeometry args={[0.026, 0.005, 0.008]} />
              <meshStandardMaterial color="#475569" roughness={0.65} />
            </mesh>
          );
        })}
        <mesh name="PressureZeroKnobBody" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.118, 0.108, 0.084, 32]} />
          <meshStandardMaterial color={zeroEnabled ? '#b87516' : '#64748b'} roughness={0.5} metalness={0.08} emissive={pressureZeroHovered ? '#0e7490' : '#000000'} emissiveIntensity={pressureZeroHovered ? NON_BULB_HOVER_EMISSIVE_INTENSITY : 0} />
        </mesh>
        <mesh name="PressureZeroKnobFace" position={[0, 0, 0.048]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.096, 0.102, 0.014, 32]} />
          <meshStandardMaterial color={zeroEnabled ? '#c0841a' : '#94a3b8'} roughness={0.46} metalness={0.04} emissive={pressureZeroHovered ? '#075985' : '#000000'} emissiveIntensity={pressureZeroHovered ? 0.16 : 0} />
        </mesh>
        <mesh name="PressureZeroKnobRim" position={[0, 0, 0.058]} raycast={DISABLE_RAYCAST}>
          <torusGeometry args={[0.103, 0.006, 8, 32]} />
          <meshStandardMaterial color={zeroEnabled ? '#7c4708' : '#475569'} roughness={0.4} metalness={0.16} />
        </mesh>
        <mesh name="PressureZeroKnobCenter" position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]} raycast={DISABLE_RAYCAST}>
          <cylinderGeometry args={[0.018, 0.018, 0.01, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.42} metalness={0.12} />
        </mesh>
        {pressureZeroHovered ? (
          <mesh name="PressureZeroHoverHalo" position={[0, 0, 0.047]} raycast={DISABLE_RAYCAST}>
            <torusGeometry args={[0.135, 0.006, 8, 28]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={NON_BULB_HOVER_HALO_OPACITY} depthWrite={false} />
          </mesh>
        ) : null}
        <group name="PressureZeroIndicatorGroup" rotation={[0, 0, THREE.MathUtils.degToRad(pressureZeroKnobAngle)]}>
          <mesh name="PressureZeroIndicatorLine" position={[0.035, 0, 0.076]} raycast={DISABLE_RAYCAST}>
            <boxGeometry args={[0.105, 0.013, 0.016]} />
            <meshStandardMaterial color="#111827" roughness={0.34} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function GlassStopcock({
  angleDeg,
  onStopcockAngleChange,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  onLockedInteraction,
  interactionQualityReduced,
}: Pick<HeatCapacityInstrumentSceneProps, 'onStopcockAngleChange' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'onLockedInteraction'> & {
  angleDeg: number;
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  interactionQualityReduced: boolean;
}) {
  const { camera, gl } = useThree();
  const assemblyRef = useRef<THREE.Group | null>(null);
  const latestAngleRef = useRef(angleDeg);
  const angleOffsetRef = useRef(0);
  const interactionPlaneRef = useRef(new THREE.Plane());
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const valvePivotRef = useRef(new THREE.Vector3());
  const valveAxisRef = useRef(new THREE.Vector3());
  const referenceVectorRef = useRef(new THREE.Vector3());
  const signedVectorRef = useRef(new THREE.Vector3());
  const hitPointRef = useRef(new THREE.Vector3());
  const worldQuaternionRef = useRef(new THREE.Quaternion());

  useEffect(() => {
    latestAngleRef.current = angleDeg;
  }, [angleDeg]);

  const getPointerAngleOnValvePlane = (clientX: number, clientY: number) => {
    if (!assemblyRef.current) return null;
    const rect = gl.domElement.getBoundingClientRect();
    pointerRef.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycasterRef.current.setFromCamera(pointerRef.current, camera);
    assemblyRef.current.getWorldPosition(valvePivotRef.current);
    assemblyRef.current.getWorldQuaternion(worldQuaternionRef.current);

    valveAxisRef.current.set(1, 0, 0).applyQuaternion(worldQuaternionRef.current).normalize();
    referenceVectorRef.current.set(0, 0, 1).applyQuaternion(worldQuaternionRef.current).normalize();
    signedVectorRef.current.set(0, -1, 0).applyQuaternion(worldQuaternionRef.current).normalize();
    interactionPlaneRef.current.setFromNormalAndCoplanarPoint(valveAxisRef.current, valvePivotRef.current);

    const hitPoint = raycasterRef.current.ray.intersectPlane(interactionPlaneRef.current, hitPointRef.current);
    if (!hitPoint) return null;
    const projected = hitPoint.sub(valvePivotRef.current);
    projected.addScaledVector(valveAxisRef.current, -projected.dot(valveAxisRef.current));
    if (projected.lengthSq() < 0.0001) return null;
    projected.normalize();
    return Math.atan2(
      projected.dot(signedVectorRef.current),
      projected.dot(referenceVectorRef.current),
    ) * 180 / Math.PI;
  };

  const startDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const startPointerAngle = getPointerAngleOnValvePlane(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
    );
    if (startPointerAngle === null) return;
    angleOffsetRef.current = latestAngleRef.current - startPointerAngle;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentPointerAngle = getPointerAngleOnValvePlane(moveEvent.clientX, moveEvent.clientY);
      if (currentPointerAngle === null) return;
      const nextAngle = currentPointerAngle + angleOffsetRef.current;
      latestAngleRef.current = nextAngle;
      onStopcockAngleChange(nextAngle);
    };

    const handlePointerUp = () => {
      onStopcockAngleChange(normalizeHeatCapacityStopcockAngle(latestAngleRef.current));
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleStopcockWheel = (event: ThreeEvent<WheelEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    event.nativeEvent.preventDefault();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const wheelStep = event.nativeEvent.altKey
      ? 1
      : event.nativeEvent.shiftKey
        ? 10
        : STOPCOCK_WHEEL_STEP_DEG;
    const direction = event.nativeEvent.deltaY < 0 ? 1 : -1;
    onStopcockAngleChange(normalizeHeatCapacityStopcockAngle(angleDeg + direction * wheelStep));
  };

  const state = getHeatCapacityStopcockState(angleDeg);
  const stopcockHovered = hoveredControl === 'stopcock';
  const stopcockDemoFocused = demoFocusPulseActive && demoFocusControlId === 'stopcock';
  const angleRad = (angleDeg * Math.PI) / 180;

  return (
    <group name="GlassStopcockAssembly" ref={assemblyRef} position={[0, 1.58, 0]}>
      <mesh name="StopcockBody" rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.76, 32]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.18} roughness={0.06} transmission={0.48} />
      </mesh>
      <mesh name="StopcockSidePort" position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.16, 20]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.3} roughness={0.08} transmission={0.25} />
      </mesh>
      <mesh name="StopcockTopVentOutlet" position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.043, 0.048, 0.36, 24]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.28} roughness={0.08} transmission={0.25} />
      </mesh>
      <mesh name="StopcockDownTube" position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.72, 24]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.28} roughness={0.08} transmission={0.25} />
      </mesh>
      <group
        name="StopcockRotatingCore"
        rotation={[angleRad, 0, 0]}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onFocus('stopcock');
        }}
        onPointerDown={focusMode === 'stopcock' ? startDrag : undefined}
        onWheel={handleStopcockWheel}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('stopcock');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="HitboxStopcockHandle">
          <boxGeometry args={[1.62, 1.04, 0.64]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={stopcockDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloStopcock" rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.19, 0.19, 0.84, 24]} />
        </DemoFocusHalo>
        <mesh name="StopcockCorePlug" rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.34, 32]} />
          <meshPhysicalMaterial
            color={stopcockHovered ? '#ecfeff' : '#d9f5ff'}
            transparent
            opacity={stopcockHovered ? 0.34 : 0.24}
            roughness={0.06}
            transmission={0.36}
            emissive={stopcockHovered ? '#0e7490' : '#000000'}
            emissiveIntensity={stopcockHovered ? GLASS_HOVER_EMISSIVE_INTENSITY : 0}
          />
        </mesh>
        {stopcockHovered && !interactionQualityReduced ? (
          <mesh name="StopcockCoreHoverHalo" rotation={[0, 0, Math.PI / 2]} raycast={DISABLE_RAYCAST}>
            <cylinderGeometry args={[0.158, 0.158, 0.35, 32]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={GLASS_HOVER_HALO_OPACITY} depthWrite={false} />
          </mesh>
        ) : null}
        <mesh name="StopcockRotatingFlowChannel" position={[0, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 16]} />
          <meshStandardMaterial
            color={state === 'open' ? '#22c55e' : '#334155'}
            emissive={state === 'open' ? '#16a34a' : '#0891b2'}
            emissiveIntensity={state === 'open' ? 0.85 : 0.24}
            transparent
            opacity={state === 'open' ? 0.96 : 0.76}
            depthTest={false}
          />
          <Edges color={state === 'open' ? '#bbf7d0' : '#67e8f9'} />
        </mesh>
        <group name="StopcockRodHandle" position={[0.44, 0, 0]}>
          <mesh name="StopcockRodHandleConnector" position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.24, 20]} />
            <meshPhysicalMaterial
              color={stopcockHovered ? '#ecfeff' : '#d9f5ff'}
              transparent
              opacity={stopcockHovered ? 0.68 : 0.55}
              roughness={0.08}
              transmission={0.2}
              emissive={stopcockHovered ? '#0e7490' : '#000000'}
              emissiveIntensity={stopcockHovered ? GLASS_HOVER_EMISSIVE_INTENSITY : 0}
            />
          </mesh>
          <mesh name="StopcockRodHandleStem">
            <cylinderGeometry args={[0.035, 0.035, 0.58, 24]} />
            <meshPhysicalMaterial
              color={stopcockHovered ? '#ecfeff' : '#d9f5ff'}
              transparent
              opacity={stopcockHovered ? 0.78 : 0.66}
              roughness={0.08}
              transmission={0.22}
              emissive={stopcockHovered ? '#0e7490' : '#000000'}
              emissiveIntensity={stopcockHovered ? GLASS_HOVER_EMISSIVE_INTENSITY : 0}
            />
          </mesh>
          {stopcockHovered ? (
            <mesh name="StopcockRodHandleHoverHalo" raycast={DISABLE_RAYCAST}>
              <cylinderGeometry args={[0.05, 0.05, 0.6, 24]} />
              <meshBasicMaterial color="#7dd3fc" transparent opacity={GLASS_HOVER_HALO_OPACITY} depthWrite={false} />
            </mesh>
          ) : null}
          <mesh name="StopcockRodHandleTipTop" position={[0, 0.31, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.66} roughness={0.08} transmission={0.22} />
          </mesh>
          <mesh name="StopcockRodHandleTipBottom" position={[0, -0.31, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.66} roughness={0.08} transmission={0.22} />
          </mesh>
        </group>
      </group>
      {state === 'open' ? (
        <group name="StopcockVentFlowArrow" position={[0, 0.62, 0]}>
          <mesh name="StopcockVentFlowArrowStem">
            <cylinderGeometry args={[0.018, 0.018, 0.24, 16]} />
            <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.75} />
          </mesh>
          <mesh name="StopcockVentFlowArrowHead" position={[0, 0.15, 0]}>
            <coneGeometry args={[0.055, 0.12, 20]} />
            <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.75} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function PressureBottle({
  stopcockAngleDeg,
  onStopcockAngleChange,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  onLockedInteraction,
  interactionQualityReduced,
}: Pick<HeatCapacityInstrumentSceneProps, 'onStopcockAngleChange' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'onLockedInteraction'> & {
  stopcockAngleDeg: number;
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  interactionQualityReduced: boolean;
}) {
  return (
    <group name="SquareGlassPressureBottle" position={[-1.3, -0.28, 0]}>
      <mesh name="BottleBase" position={[0, -1.22, 0]} receiveShadow>
        <boxGeometry args={[1.85, 0.18, 1.85]} />
        <meshStandardMaterial color="#6b7280" roughness={0.6} />
      </mesh>
      <mesh name="VesselGlassCube">
        <boxGeometry args={[1.75, 1.75, 1.75]} />
        <meshPhysicalMaterial color="#a7d8ff" transparent opacity={0.16} roughness={0.08} transmission={0.45} />
        <Edges color="#d5efff" />
      </mesh>
      <mesh name="BottleMouthNeck" position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.43, 0.39, 0.34, 28]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.2} roughness={0.08} transmission={0.35} />
      </mesh>
      <mesh name="BottleMouthRim" position={[0, 1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.025, 8, 32]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.28} roughness={0.08} transmission={0.3} />
      </mesh>
      <mesh name="RubberStopper" position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.54, 0.42, 0.24, 28]} />
        <meshStandardMaterial color="#e5d1a8" roughness={0.72} />
      </mesh>
      <mesh name="CentralSensorStopperHole" position={[0.16, 1.16, 0.24]}>
        <cylinderGeometry args={[0.085, 0.085, 0.035, 24]} />
        <meshStandardMaterial color="#5b4631" roughness={0.82} />
      </mesh>
      <mesh name="SharedServiceCablePort" position={[0.2, 1.17, 0.36]}>
        <cylinderGeometry args={[0.06, 0.06, 0.045, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.78} />
      </mesh>
      <mesh name="SensorToServicePortTrace" position={[0.18, 1.176, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.13, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.66} />
      </mesh>
      <mesh name="TopNeck" position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.5, 32]} />
        <meshPhysicalMaterial color="#d9f5ff" transparent opacity={0.3} roughness={0.08} transmission={0.25} />
      </mesh>
      <mesh name="SensorStopperPort" position={[0.16, 0.96, 0.24]}>
        <cylinderGeometry args={[0.075, 0.075, 0.08, 20]} />
        <meshStandardMaterial color="#9aa4b2" roughness={0.44} metalness={0.1} />
      </mesh>
      <mesh name="SensorRod" position={[0.16, 0.52, 0.24]}>
        <cylinderGeometry args={[0.035, 0.035, 0.875, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.34} metalness={0.15} />
      </mesh>
      <GlassStopcock
        angleDeg={stopcockAngleDeg}
        onStopcockAngleChange={onStopcockAngleChange}
        onFocus={onFocus}
        focusMode={focusMode}
        hoveredControl={hoveredControl}
        setHoveredControl={setHoveredControl}
        interactionLocked={interactionLocked}
        demoFocusControlId={demoFocusControlId}
          demoFocusPulseActive={demoFocusPulseActive}
          interactionQualityReduced={interactionQualityReduced}
          onLockedInteraction={onLockedInteraction}
        />
    </group>
  );
}

function InstrumentLeads() {
  return (
    <group name="InstrumentLeadSet">
      <mesh name="ServicePortBundleAnchor" position={[-1.1, 0.92, 1.1]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      <mesh name="ExternalTemperatureLeadAnchor" position={[-0.52, 0.36, 1.22]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      <mesh name="ExternalPressureLeadAnchor" position={[-0.28, 0.46, 1.42]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      <Line
        name="TemperaturePositiveLead"
        points={[
          [-1.1, 0.89, 0.36],
          [-1.1, 0.92, 1.1],
          [-0.52, 0.36, 1.22],
          [0.52, -0.18, 1.02],
          [1.12, -0.62, 0.51],
        ]}
        color="#dc2626"
        lineWidth={2}
      />
      <Line
        name="TemperatureNegativeLead"
        points={[
          [-1.08, 0.885, 0.38],
          [-1.1, 0.92, 1.1],
          [-0.62, 0.26, 1.34],
          [0.46, -0.28, 1.08],
          [1.3, -0.62, 0.51],
        ]}
        color="#374151"
        lineWidth={3}
      />
      <Line
        name="PressureSensorLead"
        points={[
          [-1.12, 0.88, 0.34],
          [-1.1, 0.92, 1.1],
          [-0.28, 0.46, 1.42],
          [0.84, -0.14, 1.14],
          [1.77, -0.63, 0.51],
        ]}
        color="#cbd5e1"
        lineWidth={4}
      />
    </group>
  );
}

function PumpAssembly({
  pumpValveOpen,
  pumpBulbState,
  pumpPulseId,
  onPumpValveToggle,
  onPumpBulbPress,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  onLockedInteraction,
  interactionQualityReduced,
}: Pick<HeatCapacityInstrumentSceneProps, 'pumpValveOpen' | 'pumpBulbState' | 'pumpPulseId' | 'onPumpValveToggle' | 'onPumpBulbPress' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'onLockedInteraction'> & {
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  interactionQualityReduced: boolean;
}) {
  const bulbHovered = hoveredControl === 'pumpBulb';
  const valveHovered = hoveredControl === 'pumpValve';
  const pumpBulbDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pumpBulb';
  const pumpValveDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pumpValve';
  const [valveHandleAngle, setValveHandleAngle] = useState(pumpValveOpen ? 0 : Math.PI / 2);
  const pumpPulseTimersRef = useRef<{
    releaseTimerId: number | null;
    idleTimerId: number | null;
  }>({ releaseTimerId: null, idleTimerId: null });
  const [pumpPulseVisualState, setPumpPulseVisualState] = useState<HeatCapacityInstrumentSceneProps['pumpBulbState']>('idle');
  const visualPumpBulbState = pumpPulseVisualState !== 'idle' ? pumpPulseVisualState : pumpBulbState;
  const pumpBulbScale: [number, number, number] = visualPumpBulbState === 'compressing'
    ? [1.08, 0.7, 1.06]
    : visualPumpBulbState === 'releasing'
      ? [1.02, 0.92, 1.01]
      : [1, 1, 1];
  const pumpBulbActive = visualPumpBulbState !== 'idle';
  const tubeColor = pumpValveOpen && pumpBulbActive ? '#7dd3fc' : '#64748b';

  const clearPumpPulseTimers = () => {
    const timers = pumpPulseTimersRef.current;
    if (timers.releaseTimerId !== null) {
      window.clearTimeout(timers.releaseTimerId);
      timers.releaseTimerId = null;
    }
    if (timers.idleTimerId !== null) {
      window.clearTimeout(timers.idleTimerId);
      timers.idleTimerId = null;
    }
  };

  const handlePumpBulbPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    onPumpBulbPress();
  };

  useEffect(() => {
    const targetAngle = pumpValveOpen ? 0 : Math.PI / 2;
    const startAngle = valveHandleAngle;
    const startTime = performance.now();
    const duration = PUMP_VALVE_TRANSITION_MS;
    let frameId = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setValveHandleAngle(startAngle + (targetAngle - startAngle) * eased);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [pumpValveOpen]);

  useEffect(() => {
    if (pumpPulseId <= 0) return undefined;
    clearPumpPulseTimers();
    setPumpPulseVisualState('compressing');
    pumpPulseTimersRef.current.releaseTimerId = window.setTimeout(() => {
      pumpPulseTimersRef.current.releaseTimerId = null;
      setPumpPulseVisualState('releasing');
    }, 90);
    pumpPulseTimersRef.current.idleTimerId = window.setTimeout(() => {
      pumpPulseTimersRef.current.idleTimerId = null;
      setPumpPulseVisualState('idle');
    }, 280);
    return clearPumpPulseTimers;
  }, [pumpPulseId]);

  return (
    <group
      name="pumpAssembly"
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (interactionLocked) {
          onLockedInteraction();
          return;
        }
        onFocus('pump');
      }}
    >
      <mesh name="pumpPortOnStopper" position={[-1.72, 0.9, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.18, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.58} metalness={0.2} />
        {!interactionQualityReduced ? <Edges color="#dbeafe" /> : null}
      </mesh>
      <mesh name="pumpShortConnectorIn" position={[-1.72, 0.9, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.16, 16]} />
        <meshStandardMaterial color="#7c8794" roughness={0.42} metalness={0.35} />
      </mesh>
      <group
        name="pumpValve"
        position={[-1.72, 0.9, 0.54]}
        onClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onPumpValveToggle();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onFocus('stopcock');
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('pumpValve');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="pumpValveHitbox">
          <boxGeometry args={[0.48, 0.42, 0.48]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pumpValveDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPumpValve" position={[0, 0.04, 0]}>
          <boxGeometry args={[0.56, 0.48, 0.52]} />
        </DemoFocusHalo>
        <mesh name="pumpValveBody" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.32, 24]} />
          <meshStandardMaterial color="#9aa4af" roughness={0.34} metalness={0.58} emissive={valveHovered ? '#0e7490' : '#000000'} emissiveIntensity={valveHovered ? NON_BULB_HOVER_EMISSIVE_INTENSITY : 0} />
          {valveHovered && !interactionQualityReduced ? <Edges color="#e0f2fe" /> : null}
        </mesh>
        <mesh name="pumpValveHexNutLeft" position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.115, 0.105, 0.055, 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.32} metalness={0.5} />
        </mesh>
        <mesh name="pumpValveHexNutRight" position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.105, 0.115, 0.055, 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.32} metalness={0.5} />
        </mesh>
        <mesh name="pumpValveStateBadge" position={[0.13, 0.02, 0]}>
          <sphereGeometry args={[0.035, 12, 10]} />
          <meshStandardMaterial color={pumpValveOpen ? '#22c55e' : '#7f1d1d'} emissive={pumpValveOpen ? '#16a34a' : '#450a0a'} emissiveIntensity={0.22} roughness={0.45} />
        </mesh>
        <group name="pumpValveHandle" position={[0, 0, 0]} rotation={[0, valveHandleAngle, 0]}>
          <mesh name="pumpValveStem" position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.12, 14]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.36} metalness={0.48} />
          </mesh>
          <mesh name="pumpValveWingHandle" position={[0, 0.18, 0]}>
            <boxGeometry args={[0.34, 0.052, 0.078]} />
            <meshStandardMaterial color={pumpValveOpen ? '#b91c1c' : '#991b1b'} roughness={0.48} metalness={0.06} emissive={valveHovered ? '#7f1d1d' : '#000000'} emissiveIntensity={valveHovered ? NON_BULB_HOVER_EMISSIVE_INTENSITY : 0} />
          </mesh>
          <mesh name="pumpValveWingHandleGripLeft" position={[-0.2, 0.18, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.46} metalness={0.18} />
          </mesh>
          <mesh name="pumpValveWingHandleGripRight" position={[0.2, 0.18, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.46} metalness={0.18} />
          </mesh>
        </group>
      </group>
      <mesh name="pumpShortConnectorOut" position={[-1.72, 0.9, 0.69]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.058, 0.058, 0.14, 16]} />
        <meshStandardMaterial color="#7c8794" roughness={0.42} metalness={0.35} />
      </mesh>
      <Line
        name="pumpTube"
        points={[
          [-1.72, 0.9, 0.74],
          [-2.18, 0.72, 0.92],
          [-2.18, -0.3, 1.52],
          [-1.18, -1.08, 1.62],
          [0.32, -1.28, 1.42],
          [1.66, -0.98, 1.08],
        ]}
        color={tubeColor}
        lineWidth={8}
      />
      <group
        name="pumpBulb"
        position={[1.85, -1.03, 1.05]}
        scale={pumpBulbScale}
        onPointerDown={focusMode === 'pump' ? handlePumpBulbPointerDown : undefined}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          if (focusMode === 'pump') return;
          onFocus('pump');
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('pumpBulb');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="pumpBulbHitbox">
          <boxGeometry args={[0.62, 0.42, 0.62]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pumpBulbDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPumpBulb" rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.014, 8, 32]} />
        </DemoFocusHalo>
        <mesh name="pumpBulbStatusHalo" visible={pumpBulbActive || bulbHovered} rotation={[Math.PI / 2, 0, 0]} raycast={DISABLE_RAYCAST}>
          <torusGeometry args={[0.29, 0.01, 8, 30]} />
          <meshBasicMaterial color={pumpBulbActive ? '#67e8f9' : '#bae6fd'} transparent opacity={pumpBulbActive ? 0.34 : 0.2} depthWrite={false} />
        </mesh>
        <mesh name="pumpBulbRubber">
          <sphereGeometry args={[0.24, 20, 14]} />
          <meshStandardMaterial color={pumpBulbActive ? '#2098a8' : '#1f7a8c'} roughness={0.5} metalness={0.02} emissive={bulbHovered || pumpBulbActive ? '#0e7490' : '#000000'} emissiveIntensity={pumpBulbActive ? 0.18 : bulbHovered ? 0.24 : 0} />
          {bulbHovered && !interactionQualityReduced ? <Edges color="#ecfeff" /> : null}
        </mesh>
        <mesh name="pumpBulbBase" position={[0, -0.23, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.08, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}

function InstrumentSceneContent(props: HeatCapacityInstrumentSceneProps & {
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  interactionQualityReduced: boolean;
  visualQualityReduced: boolean;
  shadowQualityReduced: boolean;
}) {
  const stopcockState = getHeatCapacityStopcockState(props.stopcockAngleDeg);
  const zeroEnabled = props.powerOn && stopcockState === 'open';

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[3.4, 4.8, 4]} intensity={props.visualQualityReduced ? 0.92 : 1.1} castShadow={!props.shadowQualityReduced} />
      <pointLight position={[-3, 2.2, 3]} intensity={0.52} color="#8fd6ff" />

      <mesh name="WorkbenchDeck" rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow>
        <planeGeometry args={[6.3, 3.7]} />
        <meshStandardMaterial color="#202b3c" roughness={0.82} />
      </mesh>

      <group name="HeatCapacityProceduralSkeleton" scale={0.9} position={[0, -0.08, 0]}>
        <PressureBottle
          stopcockAngleDeg={props.stopcockAngleDeg}
          onStopcockAngleChange={props.onStopcockAngleChange}
          onFocus={props.onFocus}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          interactionQualityReduced={props.visualQualityReduced}
          onLockedInteraction={props.onLockedInteraction}
        />
        <InstrumentLeads />
        <PumpAssembly
          pumpValveOpen={props.pumpValveOpen}
          pumpBulbState={props.pumpBulbState}
          pumpPulseId={props.pumpPulseId}
          onPumpValveToggle={props.onPumpValveToggle}
          onPumpBulbPress={props.onPumpBulbPress}
          onFocus={props.onFocus}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          interactionQualityReduced={props.visualQualityReduced}
          onLockedInteraction={props.onLockedInteraction}
        />
        <InstrumentBox
          powerOn={props.powerOn}
          pressureZeroKnobAngle={props.pressureZeroKnobAngle}
          pressureGaugeDisplayValue={props.pressureGaugeDisplayValue}
          gaugePressureMinKPa={props.gaugePressureMinKPa}
          gaugePressureMaxKPa={props.gaugePressureMaxKPa}
          pressureSafetyThresholdKPa={props.pressureSafetyThresholdKPa}
          pressureOverLimit={props.pressureOverLimit}
          temperatureSignalMv={props.temperatureSignalMv}
          pressureSignalMv={props.pressureSignalMv}
          onPowerToggle={props.onPowerToggle}
          onPressureZero={props.onPressureZero}
          onPressureZeroFineAdjust={props.onPressureZeroFineAdjust}
          onPressureZeroCoarseAdjust={props.onPressureZeroCoarseAdjust}
          zeroEnabled={zeroEnabled}
          onFocus={props.onFocus}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          onLockedInteraction={props.onLockedInteraction}
          performanceMode={props.performanceMode}
          interactionQualityReduced={props.interactionQualityReduced}
        />
      </group>
    </>
  );
}

function CameraRig({
  controlsRef,
  focusMode,
  resetKey,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  focusMode: HeatCapacityFocusMode;
  resetKey: number;
}) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const startPosition = camera.position.clone();
    const startTarget = controlsRef.current?.target.clone() ?? new THREE.Vector3(0.25, -0.05, 0);
    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();
    if (focusMode === 'stopcock') {
      nextPosition.set(1.02, 2.04, 2.64);
      nextTarget.set(-1.27, 0.79, 0.07);
    } else if (focusMode === 'instrument') {
      nextPosition.set(2.18, 0.18, 3.42);
      nextTarget.set(2.02, -0.76, 0.34);
    } else if (focusMode === 'pump') {
      nextPosition.set(2.95, 0.25, 3.35);
      nextTarget.set(1.65, -0.45, 0.95);
    } else {
      nextPosition.set(...DEFAULT_CAMERA_POSITION);
      nextTarget.set(...DEFAULT_CAMERA_TARGET);
    }

    let frameId = 0;
    const startTime = performance.now();
    const duration = 360;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      camera.position.lerpVectors(startPosition, nextPosition, eased);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, nextTarget, eased);
        camera.lookAt(controlsRef.current.target);
        controlsRef.current.update();
      } else {
        camera.lookAt(nextTarget);
      }
      invalidate();
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [camera, controlsRef, focusMode, invalidate, resetKey]);

  return null;
}

function HeatCapacitySceneInvalidator({
  active,
  performanceMode,
}: {
  active: boolean;
  performanceMode: 'standard' | 'performance';
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    if (!active) return undefined;
    const intervalMs = performanceMode === 'performance' ? 66 : 33;
    const intervalId = window.setInterval(() => {
      invalidate();
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [active, invalidate, performanceMode]);

  return null;
}

function HeatCapacityOrbitControls({
  controlsRef,
  enabled,
  onInteractionStart,
  onInteractionEnd,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  enabled: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const invalidate = useThree((state) => state.invalidate);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      target={DEFAULT_CAMERA_TARGET}
      enablePan={true}
      enableZoom={true}
      minDistance={ORBIT_MIN_DISTANCE}
      maxDistance={ORBIT_MAX_DISTANCE}
      minPolarAngle={0.62}
      maxPolarAngle={1.42}
      onStart={onInteractionStart}
      onEnd={onInteractionEnd}
      onChange={() => invalidate()}
    />
  );
}

export default function HeatCapacityInstrumentScene(props: HeatCapacityInstrumentSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const [focusMode, setFocusMode] = useState<HeatCapacityFocusMode>('none');
  const [hoveredControl, setHoveredControl] = useState<HeatCapacityHoveredControl>(null);
  const [isOrbitInteracting, setIsOrbitInteracting] = useState(false);
  const [viewResetKey, setViewResetKey] = useState(0);
  const clearHoverTimer = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  }, []);
  const setStableHoveredControl = useCallback((control: HeatCapacityHoveredControl) => {
    clearHoverTimer();
    if (control !== null) {
      setHoveredControl(control);
      return;
    }
    hoverClearTimerRef.current = window.setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoveredControl(null);
    }, HOVER_CLEAR_DELAY_MS);
  }, [clearHoverTimer]);
  useEffect(() => clearHoverTimer, [clearHoverTimer]);
  useEffect(() => {
    props.onFocusModeChange(focusMode);
  }, [focusMode, props.onFocusModeChange]);
  const triggerSmoothDefaultView = useCallback(() => {
    setFocusMode('none');
    setViewResetKey((key) => key + 1);
  }, []);
  useEffect(() => {
    triggerSmoothDefaultView();
  }, [props.focusResetKey, triggerSmoothDefaultView]);
  const stopcockDisplayAngle = normalizeDisplayAngle(props.stopcockAngleDeg);
  const performanceMode = props.performanceMode;
  const stopcockState = getHeatCapacityStopcockState(props.stopcockAngleDeg);
  const stopcockConnected = stopcockState === 'open';
  const stopcockSliderStyle = {
    '--heat-stopcock-angle-percent': angleToSliderPercent(stopcockDisplayAngle),
  } as React.CSSProperties & Record<'--heat-stopcock-angle-percent', string>;
  const pumpBulbDisplayLabel = getPumpBulbDisplayLabel(props.pumpBulbState);
  const pumpFrequencyStatusLabel = getPumpFrequencyStatusLabel(props.pumpFrequencyStatus);
  const temperatureDisplay = props.powerOn ? formatSignal(props.temperatureSignalMv) : '未通电';
  const pressureDisplay = props.powerOn ? formatSignal(props.pressureSignalMv) : '未通电';
  const poweredInstrumentReadout = (displayValue: string) => props.powerOn ? displayValue : '未通电';
  const poweredInstrumentNumber = (displayValue: string) => props.powerOn ? displayValue : '--';
  const interactionHints = getHeatCapacityInteractionHints(focusMode);
  const hoverTooltip = getHeatCapacityHoverTooltip(hoveredControl, props.pumpValveOpen);
  const canvasProps = useMemo(() => ({
    camera: { position: DEFAULT_CAMERA_POSITION, fov: 38 },
  }), []);
  const interactionQualityReduced = isOrbitInteracting;
  const visualQualityReduced = isOrbitInteracting || performanceMode === 'performance';
  const shadowQualityReduced = true;
  const sceneShouldAnimate = props.demoFocusPulseActive || props.pumpBulbState !== 'idle';

  return (
    <div
      className="studio-heat-instrument-scene"
      data-heat-capacity-instrument-scene="true"
      data-heat-capacity-hovered-control={hoveredControl ?? undefined}
      onPointerLeave={() => setStableHoveredControl(null)}
    >
      <button
        type="button"
        className="studio-heat-view-reset"
        data-heat-capacity-view-reset="true"
        disabled={props.interactionLocked}
        onClick={() => {
          if (props.interactionLocked) {
            props.onLockedInteraction();
            return;
          }
          triggerSmoothDefaultView();
        }}
      >
        默认视角
      </button>
      <Canvas
        {...canvasProps}
        dpr={performanceMode === 'performance' ? HEAT_CAPACITY_PERFORMANCE_DPR : HEAT_CAPACITY_STANDARD_DPR}
        frameloop={performanceMode === 'performance' ? 'demand' : 'demand'}
        shadows={!shadowQualityReduced}
      >
        {/* GLB replacement contract: preserve node names, pivots, and hitbox roles from this procedural skeleton. */}
        <color attach="background" args={['#111827']} />
        <HeatCapacitySceneInvalidator active={sceneShouldAnimate} performanceMode={performanceMode} />
        <CameraRig controlsRef={controlsRef} focusMode={focusMode} resetKey={viewResetKey} />
        <InstrumentSceneContent
          {...props}
          onFocus={setFocusMode}
          focusMode={focusMode}
          hoveredControl={hoveredControl}
          setHoveredControl={setStableHoveredControl}
          interactionQualityReduced={interactionQualityReduced}
          visualQualityReduced={visualQualityReduced}
          shadowQualityReduced={shadowQualityReduced}
        />
        <HeatCapacityOrbitControls
          controlsRef={controlsRef}
          enabled={focusMode === 'none' && !props.interactionLocked}
          onInteractionStart={() => {
            setIsOrbitInteracting(true);
            setStableHoveredControl(null);
          }}
          onInteractionEnd={() => {
            setIsOrbitInteracting(false);
          }}
        />
      </Canvas>
      <div
        className="studio-heat-interaction-hints"
        data-heat-capacity-interaction-hints="true"
      >
        <strong>操作提示</strong>
        {interactionHints.map((hint) => (
          <span key={hint}>{hint}</span>
        ))}
      </div>
      {hoverTooltip ? (
        <div
          className="studio-heat-hover-tooltip"
          data-heat-capacity-hover-tooltip="true"
        >
          {hoverTooltip}
        </div>
      ) : null}
      {focusMode === 'stopcock' ? (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-stopcock"
          data-heat-capacity-focus-panel="stopcock"
        >
          <div className="studio-heat-focus-title">旋塞 / 阀门控制</div>
          <div className="studio-heat-focus-grid">
            <div className="studio-heat-focus-panel-row">
              <span>当前角度</span>
              <strong>{formatStopcockAngle(stopcockDisplayAngle)}</strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>玻璃旋塞</span>
              <strong className={stopcockConnected ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                {stopcockConnected ? '已联通' : '未联通'}
              </strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>打气阀门</span>
              <strong className={props.pumpValveOpen ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                {props.pumpValveOpen ? '已打开' : '已关闭'}
              </strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>磁吸范围</span>
              <strong>±{HEAT_CAPACITY_STOPCOCK_OPEN_MAGNET_DEG}°</strong>
            </div>
          </div>
          <div className="studio-heat-stopcock-slider-wrap" style={stopcockSliderStyle}>
            <div className="studio-heat-stopcock-slider-visual" aria-hidden="true">
              <span className="studio-heat-stopcock-slider-track" />
              <span className="studio-heat-stopcock-slider-fill" />
              <span className="studio-heat-stopcock-slider-thumb" />
              <span className="studio-heat-stopcock-open-mark" data-open-angle="0" style={{ left: angleToSliderPercent(HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG) }} />
              <span className="studio-heat-stopcock-open-mark" data-open-angle="180" style={{ left: angleToSliderPercent(HEAT_CAPACITY_STOPCOCK_SECOND_OPEN_ANGLE_DEG) }} />
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={Math.round(stopcockDisplayAngle)}
              data-heat-capacity-stopcock-slider="true"
              aria-label="旋塞角度"
              disabled={props.interactionLocked}
              onChange={(event) => props.onStopcockAngleChange(Number(event.currentTarget.value))}
            />
          </div>
          <div className="studio-heat-focus-panel-actions">
            <button
              type="button"
              disabled={props.interactionLocked}
              onClick={() => {
                if (props.interactionLocked) {
                  props.onLockedInteraction();
                  return;
                }
                props.onStopcockAngleChange(getNearestOpenAngle(stopcockDisplayAngle));
              }}
            >
              吸附到最近接通角
            </button>
            <button
              type="button"
              data-heat-capacity-focus-exit="true"
              disabled={props.interactionLocked}
              onClick={() => {
                if (props.interactionLocked) {
                  props.onLockedInteraction();
                  return;
                }
                setFocusMode('none');
              }}
            >
              退出聚焦
            </button>
          </div>
        </div>
      ) : null}
      {focusMode === 'pump' ? (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-pump"
          data-heat-capacity-focus-panel="pump"
        >
          <div className="studio-heat-focus-title">打气球控制</div>
          <div className="studio-heat-focus-grid">
            <div className="studio-heat-focus-panel-row">
              <span>打气球</span>
              <strong className={props.pumpBulbState === 'idle' ? 'studio-heat-focus-muted' : 'studio-heat-focus-positive'}>
                {pumpBulbDisplayLabel}
              </strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>打气阀门</span>
              <strong className={props.pumpValveOpen ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                {props.pumpValveOpen ? '已打开' : '已关闭'}
              </strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>打气频率</span>
              <strong>{formatPanelNumber(props.pumpFrequency, 2)} 次/s</strong>
            </div>
            <div className="studio-heat-focus-panel-row">
              <span>频率评价</span>
              <strong className={props.pumpFrequencyStatus === 'suitable' ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                {pumpFrequencyStatusLabel}
              </strong>
            </div>
          </div>
          <div className="studio-heat-focus-hint">{props.pumpHint}</div>
          <div className="studio-heat-focus-panel-actions studio-heat-focus-panel-actions-single">
            <button
              type="button"
              data-heat-capacity-focus-exit="true"
              disabled={props.interactionLocked}
              onClick={() => {
                if (props.interactionLocked) {
                  props.onLockedInteraction();
                  return;
                }
                setFocusMode('none');
              }}
            >
              退出聚焦
            </button>
          </div>
        </div>
      ) : null}
      {focusMode === 'instrument' ? (
        <div
          className="studio-heat-focus-panel studio-heat-focus-panel-instrument"
          data-heat-capacity-focus-panel="instrument"
        >
          <div className="studio-heat-focus-title">仪表读数</div>
          <div className="studio-heat-focus-instrument-columns">
            <div className="studio-heat-focus-column">
              <div className="studio-heat-focus-panel-row">
                <span>电源状态</span>
                <strong className={props.powerOn ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                  {props.powerOn ? '已开机' : '未开机'}
                </strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>U_T</span>
                <strong>{poweredInstrumentReadout(temperatureDisplay)}</strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>压力调零</span>
                <strong className={props.pressureZeroAdjusted ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                  {props.pressureZeroAdjusted ? '已调零' : '未调零'}
                </strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>显示压力</span>
                <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressureDisplayedPlaceholder, 2)} mV`)}</strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>占位温度</span>
                <strong>{poweredInstrumentNumber(formatPanelNumber(props.temperaturePlaceholder, 3))}</strong>
              </div>
            </div>
            <div className="studio-heat-focus-column">
              <div className="studio-heat-focus-panel-row">
                <span>当前阶段</span>
                <strong>{props.phase}</strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>U_P</span>
                <strong>{poweredInstrumentReadout(pressureDisplay)}</strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>零点偏移</span>
                <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressureZeroOffset, 2)} mV`)}</strong>
              </div>
              <div className="studio-heat-focus-panel-row">
                <span>占位压强</span>
                <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressurePlaceholder, 2)} kPa`)}</strong>
              </div>
            </div>
          </div>
          <div className="studio-heat-focus-panel-actions studio-heat-focus-panel-actions-single">
            <button
              type="button"
              data-heat-capacity-focus-exit="true"
              disabled={props.interactionLocked}
              onClick={() => {
                if (props.interactionLocked) {
                  props.onLockedInteraction();
                  return;
                }
                setFocusMode('none');
              }}
            >
              退出聚焦
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
