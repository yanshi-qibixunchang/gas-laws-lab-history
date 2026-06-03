import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getHeatCapacityStopcockState } from '../workbench/workbenchState';
import HeatCapacityHardSphereLayer from './HeatCapacityHardSphereLayer';

type HeatCapacityUltraInstrumentModelProps = {
  powerOn: boolean;
  sceneTheme: 'dark' | 'light';
  stopcockAngleDeg: number;
  pressureZeroKnobAngle: number;
  pressureGaugeDisplayValue: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureDeltaKPa: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  releaseFlowActive: boolean;
  releaseProgress: number;
  stopcockFlowOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: 'idle' | 'compressing' | 'releasing';
  pumpPulseId: number;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  hardSphereViewEnabled: boolean;
  hardSphereParticleMultiplier: number;
  hardSphereSpeedMultiplier: number;
};

const ULTRA_GLB_PATH = '/models/heat-capacity/fd-ncd-c-ultra.glb';
const REQUIRED_ULTRA_NODE_NAMES = [
  'FD_NCD_C_PowerSwitch_Base',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'InletValue_Pivot',
  'Pump_Bulb',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Stopcock_OpenPath_Glow',
  'HSL_Stopcock_ClosedBlocker_Mark',
] as const;

const PRESSURE_GAUGE_MIN_ROTATION = -2.15;
const PRESSURE_GAUGE_MAX_ROTATION = 2.15;
const modelPressureGaugeAngleToVisualAngle = (modelAngle: number) => Math.PI / 2 - modelAngle;
const STOPCOCK_VISUAL_SMOOTHING_RATE = 10;
const PUMP_VALVE_VISUAL_SMOOTHING_RATE = 10;
const PRESSURE_ZERO_VISUAL_SMOOTHING_RATE = 14;
const POWER_SWITCH_VISUAL_SMOOTHING_RATE = 16;
const POWER_SWITCH_OFF_ROTATION_RAD = 0.18;
const POWER_SWITCH_ON_ROTATION_RAD = -0.18;
const ULTRA_CONTROL_MOTION_INVALIDATION_MS = 560;

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

const formatSignal = (value: number | null) => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} mV` : '--.-- mV'
);

const cloneModelScene = (sourceScene: THREE.Object3D) => {
  const clonedScene = sourceScene.clone(true);
  clonedScene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.raycast = () => undefined;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => material.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
  });
  return clonedScene;
};

const collectNodes = (root: THREE.Object3D) => {
  const nodeMap = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    if (object.name) nodeMap.set(object.name, object);
  });
  return nodeMap;
};

const collectBaseTransforms = (nodeMap: Map<string, THREE.Object3D>) => {
  const baseTransforms = new Map<string, {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  }>();
  REQUIRED_ULTRA_NODE_NAMES.forEach((nodeName) => {
    const node = nodeMap.get(nodeName);
    if (!node) return;
    baseTransforms.set(nodeName, {
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone(),
    });
  });
  return baseTransforms;
};

const applyLocalAxisRotation = (
  nodeMap: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { quaternion: THREE.Quaternion }>,
  nodeName: string,
  axis: THREE.Vector3,
  angleRad: number,
) => {
  const node = nodeMap.get(nodeName);
  const base = baseTransforms.get(nodeName);
  if (!node || !base) return;
  node.quaternion.copy(base.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(axis, angleRad));
};

function HeatCapacityUltraInstrumentModel(props: HeatCapacityUltraInstrumentModelProps) {
  const gltf = useGLTF(ULTRA_GLB_PATH);
  const invalidate = useThree((state) => state.invalidate);
  const displayTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const pumpPulseRef = useRef(0);
  const pumpVisualWeightRef = useRef(0);
  const gaugeDisplayedRotationRef = useRef(PRESSURE_GAUGE_MIN_ROTATION);
  const stopcockDisplayedAngleRef = useRef(THREE.MathUtils.degToRad(props.stopcockAngleDeg));
  const pumpValveDisplayedAngleRef = useRef(props.pumpValveOpen ? 0 : Math.PI / 2);
  const pressureZeroDisplayedAngleRef = useRef(THREE.MathUtils.degToRad(props.pressureZeroKnobAngle));
  const powerSwitchDisplayedRotationRef = useRef(props.powerOn ? POWER_SWITCH_ON_ROTATION_RAD : POWER_SWITCH_OFF_ROTATION_RAD);
  const gaugeNeedleTargetRotation = getPressureGaugeNeedleRotation(
    props.pressureGaugeDisplayValue,
    props.gaugePressureMinKPa,
    props.gaugePressureMaxKPa,
    props.powerOn,
  );
  const stopcockOpen = getHeatCapacityStopcockState(props.stopcockAngleDeg) === 'open';

  const modelRoot = useMemo(() => cloneModelScene(gltf.scene), [gltf.scene]);
  const nodeMap = useMemo(() => collectNodes(modelRoot), [modelRoot]);
  const baseTransforms = useMemo(() => collectBaseTransforms(nodeMap), [nodeMap]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    displayTextureRef.current = texture;
    return () => {
      texture.dispose();
      displayTextureRef.current = null;
    };
  }, []);

  useEffect(() => {
    const texture = displayTextureRef.current;
    const canvas = texture?.image as HTMLCanvasElement | undefined;
    const context = canvas?.getContext('2d');
    if (!texture || !canvas || !context) return;
    const temperatureDisplay = props.powerOn ? formatSignal(props.temperatureSignalMv) : '';
    const pressureDisplay = props.powerOn ? formatSignal(props.pressureSignalMv) : '';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#020807';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = props.powerOn ? '#4fffd7' : 'rgba(79, 255, 215, 0.08)';
    context.font = '700 76px Consolas, "Courier New", monospace';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(temperatureDisplay, 52, 82);
    context.fillText(pressureDisplay, 52, 176);
    texture.needsUpdate = true;
    invalidate();
  }, [props.powerOn, props.pressureSignalMv, props.temperatureSignalMv, invalidate]);

  useEffect(() => {
    const texture = displayTextureRef.current;
    if (!texture) return;
    const displayAnchor = nodeMap.get('HSL_MainDisplay_DynamicPlaneAnchor');
    displayAnchor?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,
        toneMapped: false,
      });
    });
    invalidate();
  }, [nodeMap, invalidate]);

  useEffect(() => {
    REQUIRED_ULTRA_NODE_NAMES.forEach((nodeName) => {
      if (!nodeMap.has(nodeName)) {
        console.warn(`Ultra GLB is missing required node: ${nodeName}`);
      }
    });
  }, [nodeMap]);

  useEffect(() => {
    const powerLed = nodeMap.get('FD_NCD_C_PowerIndicator_LED');
    powerLed?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(props.powerOn ? '#31f59d' : '#0a3d28');
      material.emissive.set(props.powerOn ? '#31f59d' : '#000000');
      material.emissiveIntensity = props.powerOn ? 1.6 : 0;
    });
    const openPathGlow = nodeMap.get('HSL_Stopcock_OpenPath_Glow');
    const closedBlockerMark = nodeMap.get('HSL_Stopcock_ClosedBlocker_Mark');
    if (openPathGlow) openPathGlow.visible = stopcockOpen;
    if (closedBlockerMark) closedBlockerMark.visible = !stopcockOpen;
    invalidate();
  }, [invalidate, nodeMap, props.powerOn, stopcockOpen]);

  useEffect(() => {
    const startedAt = window.performance.now();
    let frameId = 0;
    const keepControlMotionRendering = (timestamp: number) => {
      invalidate();
      if (timestamp - startedAt < ULTRA_CONTROL_MOTION_INVALIDATION_MS) {
        frameId = window.requestAnimationFrame(keepControlMotionRendering);
      }
    };
    frameId = window.requestAnimationFrame(keepControlMotionRendering);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    gaugeNeedleTargetRotation,
    invalidate,
    props.powerOn,
    props.pressureZeroKnobAngle,
    props.pumpPulseId,
    props.pumpValveOpen,
    props.stopcockAngleDeg,
  ]);

  useFrame((_, delta) => {
    const targetRotation = gaugeNeedleTargetRotation;
    const smoothing = 1 - Math.exp(-9 * delta);
    gaugeDisplayedRotationRef.current = clampSceneNumber(
      THREE.MathUtils.lerp(gaugeDisplayedRotationRef.current, targetRotation, smoothing),
      PRESSURE_GAUGE_MIN_ROTATION,
      PRESSURE_GAUGE_MAX_ROTATION,
    );
    const pressureNeedle = nodeMap.get('HSL_PressureGauge_NeedlePivot');
    if (pressureNeedle) {
      applyLocalAxisRotation(
        nodeMap,
        baseTransforms,
        'HSL_PressureGauge_NeedlePivot',
        new THREE.Vector3(0, 0, 1),
        modelPressureGaugeAngleToVisualAngle(gaugeDisplayedRotationRef.current),
      );
    }

    const stopcockTargetAngle = THREE.MathUtils.degToRad(props.stopcockAngleDeg);
    const stopcockSmoothing = 1 - Math.exp(-STOPCOCK_VISUAL_SMOOTHING_RATE * delta);
    stopcockDisplayedAngleRef.current = THREE.MathUtils.lerp(
      stopcockDisplayedAngleRef.current,
      stopcockTargetAngle,
      stopcockSmoothing,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'Stopcock_Pivot',
      new THREE.Vector3(1, 0, 0),
      stopcockDisplayedAngleRef.current,
    );

    const pumpValveTargetAngle = props.pumpValveOpen ? 0 : Math.PI / 2;
    const pumpValveSmoothing = 1 - Math.exp(-PUMP_VALVE_VISUAL_SMOOTHING_RATE * delta);
    pumpValveDisplayedAngleRef.current = THREE.MathUtils.lerp(
      pumpValveDisplayedAngleRef.current,
      pumpValveTargetAngle,
      pumpValveSmoothing,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'InletValue_Pivot',
      new THREE.Vector3(0, 1, 0),
      pumpValveDisplayedAngleRef.current,
    );

    const pressureZeroTargetAngle = THREE.MathUtils.degToRad(props.pressureZeroKnobAngle);
    const pressureZeroSmoothing = 1 - Math.exp(-PRESSURE_ZERO_VISUAL_SMOOTHING_RATE * delta);
    pressureZeroDisplayedAngleRef.current = THREE.MathUtils.lerp(
      pressureZeroDisplayedAngleRef.current,
      pressureZeroTargetAngle,
      pressureZeroSmoothing,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'FD_NCD_C_ZeroAdjustKnob',
      new THREE.Vector3(0, 0, 1),
      pressureZeroDisplayedAngleRef.current,
    );

    const powerSwitchTargetRotation = props.powerOn ? POWER_SWITCH_ON_ROTATION_RAD : POWER_SWITCH_OFF_ROTATION_RAD;
    const powerSwitchSmoothing = 1 - Math.exp(-POWER_SWITCH_VISUAL_SMOOTHING_RATE * delta);
    powerSwitchDisplayedRotationRef.current = THREE.MathUtils.lerp(
      powerSwitchDisplayedRotationRef.current,
      powerSwitchTargetRotation,
      powerSwitchSmoothing,
    );
    const powerSwitch = nodeMap.get('FD_NCD_C_PowerSwitch_Button');
    const powerBase = baseTransforms.get('FD_NCD_C_PowerSwitch_Button');
    if (powerSwitch && powerBase) {
      powerSwitch.position.copy(powerBase.position);
    }
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'FD_NCD_C_PowerSwitch_Button',
      new THREE.Vector3(1, 0, 0),
      powerSwitchDisplayedRotationRef.current,
    );

    if (props.pumpPulseId !== pumpPulseRef.current) {
      pumpPulseRef.current = props.pumpPulseId;
      pumpVisualWeightRef.current = 1;
    }
    if (props.pumpBulbState !== 'idle') {
      pumpVisualWeightRef.current = Math.max(props.pumpBulbState === 'compressing' ? 1 : 0.45, pumpVisualWeightRef.current);
    }
    pumpVisualWeightRef.current = Math.max(0, pumpVisualWeightRef.current - delta * 2.4);
    const pumpBulb = nodeMap.get('Pump_Bulb') as THREE.Mesh | undefined;
    if (pumpBulb?.morphTargetInfluences?.length) {
      pumpBulb.morphTargetInfluences[0] = pumpVisualWeightRef.current;
    }
    if (
      Math.abs(gaugeDisplayedRotationRef.current - targetRotation) > 0.001 ||
      Math.abs(stopcockDisplayedAngleRef.current - stopcockTargetAngle) > 0.002 ||
      Math.abs(pumpValveDisplayedAngleRef.current - pumpValveTargetAngle) > 0.002 ||
      Math.abs(pressureZeroDisplayedAngleRef.current - pressureZeroTargetAngle) > 0.002 ||
      Math.abs(powerSwitchDisplayedRotationRef.current - powerSwitchTargetRotation) > 0.002 ||
      pumpVisualWeightRef.current > 0
    ) {
      invalidate();
    }
  });

  return (
    <group name="HeatCapacityUltraInstrumentRuntime">
      <primitive object={modelRoot} />
      <HeatCapacityHardSphereLayer
        enabled={props.hardSphereViewEnabled}
        powerOn={props.powerOn}
        temperatureMv={props.temperatureSignalMv}
        pressureMv={props.pressureSignalMv}
        pressureDeltaKPa={props.pressureDeltaKPa}
        gasAmountRatio={props.gasAmountRatio}
        gasTemperatureK={props.gasTemperatureK}
        ambientTemperatureK={props.ambientTemperatureK}
        phase={props.phase}
        releaseFlowActive={props.releaseFlowActive}
        releaseProgress={props.releaseProgress}
        stopcockFlowOpen={props.stopcockFlowOpen}
        glassStopcockOpen={getHeatCapacityStopcockState(props.stopcockAngleDeg) === 'open'}
        pumpValveOpen={props.pumpValveOpen}
        pumpBulbState={props.pumpBulbState}
        pumpFlowActive={props.pumpFlowActive}
        pumpFlowIntensity={props.pumpFlowIntensity}
        particleMultiplier={props.hardSphereParticleMultiplier}
        speedMultiplier={props.hardSphereSpeedMultiplier}
        sceneTheme={props.sceneTheme}
      />
    </group>
  );
}

useGLTF.preload(ULTRA_GLB_PATH);

export default HeatCapacityUltraInstrumentModel;
