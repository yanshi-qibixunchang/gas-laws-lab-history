import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getHeatCapacityStopcockState } from '../workbench/workbenchState';
import HeatCapacityHardSphereLayer from './HeatCapacityHardSphereLayer';

type HeatCapacityFocusMode = 'none' | 'stopcock' | 'instrument' | 'pump';
type HeatCapacityHoveredControl = null | 'stopcock' | 'pumpBulb' | 'pumpValve' | 'powerSwitch' | 'pressureZero';
type ValveFocusControl = 'stopcock' | 'pumpValve';

type HeatCapacityUltraInstrumentModelProps = {
  powerOn: boolean;
  sceneTheme: 'dark' | 'light';
  stopcockAngleDeg: number;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureGaugeDisplayValue: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureOverLimit: boolean;
  pressureDeltaKPa: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  pressureReleaseBurstActive: boolean;
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
  interactionLocked: boolean;
  demoFocusControlId: string | null;
  demoFocusPulseActive: boolean;
  manualRollbackAnimation: 'valveBounce' | 'stopcockBounce' | 'pumpBulbBounce' | 'knobBounce' | 'powerBounce' | null;
  manualRollbackKey: number;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  onFocus: (mode: HeatCapacityFocusMode) => void;
  onValveFocusAnchor: (source: ValveFocusControl, clientX: number, clientY: number) => void;
  onPowerToggle: (nextPowerOn: boolean) => void;
  onStopcockOpenChange: (nextOpen: boolean) => void;
  onPressureZeroFineAdjust: (direction: number) => void;
  onPressureZeroCoarseAdjust: (angleDeltaDeg: number) => void;
  onPumpValveToggle: () => void;
  onPumpBulbPress: () => void;
  onLockedInteraction: (message?: string) => void;
};

const ULTRA_GLB_PATH = '/models/heat-capacity/fd-ncd-c-ultra.glb';
const REQUIRED_ULTRA_NODE_NAMES = [
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'InletValue_Pivot',
  'Pump_Bulb',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Hitbox_Stopcock',
  'HSL_Hitbox_PumpBulb',
  'HSL_Hitbox_PumpValve',
] as const;

const PRESSURE_GAUGE_MIN_ROTATION = -2.15;
const PRESSURE_GAUGE_MAX_ROTATION = 2.15;
const modelPressureGaugeAngleToVisualAngle = (modelAngle: number) => Math.PI / 2 - modelAngle;

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

type InteractiveBox = {
  position: [number, number, number];
  size: [number, number, number];
};

const createInteractiveBox = (node: THREE.Object3D | undefined, minSize: [number, number, number]): InteractiveBox | null => {
  if (!node) return null;
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    position: [center.x, center.y, center.z],
    size: [
      Math.max(size.x, minSize[0]),
      Math.max(size.y, minSize[1]),
      Math.max(size.z, minSize[2]),
    ],
  };
};

const createHtmlHitboxStyle = (width: number, height: number, transform?: string): React.CSSProperties => ({
  width,
  height,
  border: 0,
  padding: 0,
  opacity: 0,
  background: 'transparent',
  pointerEvents: 'auto',
  cursor: 'pointer',
  touchAction: 'none',
  ...(transform ? { transform } : {}),
});

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
  const zeroDragRef = useRef<{ active: boolean; startX: number }>({ active: false, startX: 0 });
  const pumpPulseRef = useRef(0);
  const pumpVisualWeightRef = useRef(0);
  const gaugeDisplayedRotationRef = useRef(PRESSURE_GAUGE_MIN_ROTATION);
  const gaugeNeedleTargetRotation = getPressureGaugeNeedleRotation(
    props.pressureGaugeDisplayValue,
    props.gaugePressureMinKPa,
    props.gaugePressureMaxKPa,
    props.powerOn,
  );

  const modelRoot = useMemo(() => cloneModelScene(gltf.scene), [gltf.scene]);
  const nodeMap = useMemo(() => collectNodes(modelRoot), [modelRoot]);
  const baseTransforms = useMemo(() => collectBaseTransforms(nodeMap), [nodeMap]);
  const interactiveBoxes = useMemo(() => {
    modelRoot.updateMatrixWorld(true);
    return {
      stopcock: createInteractiveBox(nodeMap.get('HSL_Hitbox_Stopcock'), [0.52, 0.52, 0.52]),
      pumpBulb: createInteractiveBox(nodeMap.get('HSL_Hitbox_PumpBulb'), [0.9, 0.7, 0.7]),
      pumpValve: createInteractiveBox(nodeMap.get('HSL_Hitbox_PumpValve'), [0.46, 0.46, 0.46]),
      powerSwitch: createInteractiveBox(nodeMap.get('FD_NCD_C_PowerSwitch_Button'), [0.75, 0.75, 0.75]),
      pressureZero: createInteractiveBox(nodeMap.get('FD_NCD_C_ZeroAdjustKnob'), [0.58, 0.58, 0.46]),
    };
  }, [modelRoot, nodeMap]);

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

    ['HSL_Hitbox_Stopcock', 'HSL_Hitbox_PumpBulb', 'HSL_Hitbox_PumpValve'].forEach((nodeName) => {
      const hitbox = nodeMap.get(nodeName);
      hitbox?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.visible = true;
        mesh.material = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
      });
    });
  }, [nodeMap]);

  useEffect(() => {
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'Stopcock_Pivot',
      new THREE.Vector3(1, 0, 0),
      THREE.MathUtils.degToRad(props.stopcockAngleDeg),
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'InletValue_Pivot',
      new THREE.Vector3(0, 1, 0),
      props.pumpValveOpen ? 0 : Math.PI / 2,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'FD_NCD_C_ZeroAdjustKnob',
      new THREE.Vector3(0, 0, 1),
      THREE.MathUtils.degToRad(props.pressureZeroKnobAngle),
    );
    const powerSwitch = nodeMap.get('FD_NCD_C_PowerSwitch_Button');
    const powerBase = baseTransforms.get('FD_NCD_C_PowerSwitch_Button');
    if (powerSwitch && powerBase) {
      powerSwitch.position.copy(powerBase.position);
      powerSwitch.position.z += props.powerOn ? -0.009 : 0;
    }
    const powerLed = nodeMap.get('FD_NCD_C_PowerIndicator_LED');
    powerLed?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(props.powerOn ? '#31f59d' : '#0a3d28');
      material.emissive.set(props.powerOn ? '#31f59d' : '#000000');
      material.emissiveIntensity = props.powerOn ? 1.6 : 0;
    });
    invalidate();
  }, [
    baseTransforms,
    invalidate,
    nodeMap,
    props.powerOn,
    props.pressureZeroKnobAngle,
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

    if (props.pumpPulseId !== pumpPulseRef.current) {
      pumpPulseRef.current = props.pumpPulseId;
      pumpVisualWeightRef.current = 1;
    }
    if (props.pumpBulbState !== 'idle') {
      pumpVisualWeightRef.current = Math.max(pumpVisualWeightRef.current, props.pumpBulbState === 'compressing' ? 1 : 0.45);
    }
    pumpVisualWeightRef.current = Math.max(0, pumpVisualWeightRef.current - delta * 2.4);
    const pumpBulb = nodeMap.get('Pump_Bulb') as THREE.Mesh | undefined;
    if (pumpBulb?.morphTargetInfluences?.length) {
      pumpBulb.morphTargetInfluences[0] = pumpVisualWeightRef.current;
    }
    if (Math.abs(gaugeDisplayedRotationRef.current - targetRotation) > 0.001 || pumpVisualWeightRef.current > 0) {
      invalidate();
    }
  });

  const handleLockedInteraction = () => {
    props.onLockedInteraction();
    props.setHoveredControl(null);
  };

  return (
    <group name="HeatCapacityUltraInstrumentRuntime">
      <primitive object={modelRoot} />
      {interactiveBoxes.stopcock ? (
        <Html position={interactiveBoxes.stopcock.position} center>
          <button
            type="button"
            aria-label="Ultra glass stopcock hitbox"
            style={createHtmlHitboxStyle(42, 42)}
            onPointerEnter={() => props.setHoveredControl('stopcock')}
            onPointerLeave={() => props.setHoveredControl(null)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onFocus('stopcock');
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked) {
                handleLockedInteraction();
                return;
              }
              const stopcockOpen = getHeatCapacityStopcockState(props.stopcockAngleDeg) === 'open';
              props.onStopcockOpenChange(!stopcockOpen);
              props.onValveFocusAnchor('stopcock', event.clientX, event.clientY);
            }}
          />
        </Html>
      ) : null}
      {interactiveBoxes.pumpBulb ? (
        <Html position={interactiveBoxes.pumpBulb.position} center>
          <button
            type="button"
            aria-label="Ultra pump bulb hitbox"
            style={createHtmlHitboxStyle(86, 62)}
            onPointerEnter={() => props.setHoveredControl('pumpBulb')}
            onPointerLeave={() => props.setHoveredControl(null)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onFocus('pump');
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked) {
                handleLockedInteraction();
                return;
              }
              if (!props.pumpValveOpen) {
                props.onLockedInteraction();
                return;
              }
              props.onPumpBulbPress();
            }}
          />
        </Html>
      ) : null}
      {interactiveBoxes.pumpValve ? (
        <Html position={interactiveBoxes.pumpValve.position} center>
          <button
            type="button"
            aria-label="Ultra pump valve hitbox"
            style={createHtmlHitboxStyle(34, 34, 'translate(-12px, 14px)')}
            onPointerEnter={() => props.setHoveredControl('pumpValve')}
            onPointerLeave={() => props.setHoveredControl(null)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onFocus('stopcock');
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked) {
                handleLockedInteraction();
                return;
              }
              props.onPumpValveToggle();
              props.onValveFocusAnchor('pumpValve', event.clientX, event.clientY);
            }}
          />
        </Html>
      ) : null}
      {interactiveBoxes.powerSwitch ? (
        <Html position={interactiveBoxes.powerSwitch.position} center>
          <button
            type="button"
            aria-label="Ultra power switch hitbox"
            style={createHtmlHitboxStyle(44, 38, 'translateY(18px)')}
            onPointerEnter={() => props.setHoveredControl('powerSwitch')}
            onPointerLeave={() => props.setHoveredControl(null)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onFocus('instrument');
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked) {
                handleLockedInteraction();
                return;
              }
              props.onPowerToggle(!props.powerOn);
            }}
          />
        </Html>
      ) : null}
      {interactiveBoxes.pressureZero ? (
        <Html position={interactiveBoxes.pressureZero.position} center>
          <button
            type="button"
            aria-label="Ultra pressure zero knob hitbox"
            style={createHtmlHitboxStyle(36, 36, 'translateY(-16px)')}
            onPointerEnter={() => props.setHoveredControl('pressureZero')}
            onPointerLeave={() => {
              zeroDragRef.current.active = false;
              props.setHoveredControl(null);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked || !props.powerOn) {
                handleLockedInteraction();
                return;
              }
              zeroDragRef.current = { active: true, startX: event.clientX };
              props.onFocus('instrument');
            }}
            onPointerMove={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.setHoveredControl('pressureZero');
              if (!zeroDragRef.current.active || props.interactionLocked) return;
              const deltaX = event.clientX - zeroDragRef.current.startX;
              if (Math.abs(deltaX) < 3) return;
              props.onPressureZeroCoarseAdjust(deltaX * 0.45);
              zeroDragRef.current.startX = event.clientX;
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              zeroDragRef.current.active = false;
            }}
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked || !props.powerOn) {
                handleLockedInteraction();
                return;
              }
              props.onPressureZeroFineAdjust(event.deltaY < 0 ? 1 : -1);
              props.onFocus('instrument');
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onFocus('instrument');
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (props.interactionLocked || !props.powerOn) {
                handleLockedInteraction();
                return;
              }
              props.onPressureZeroFineAdjust(1);
              props.onFocus('instrument');
            }}
          />
        </Html>
      ) : null}
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
