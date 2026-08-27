import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PistonOscillationModelBounds } from './pistonOscillationCameraViews.ts';

export const PISTON_OSCILLATION_GLB_PATH =
  `${import.meta.env.BASE_URL}models/piston-oscillation/piston-oscillation.glb`;

export const PISTON_OSCILLATION_REQUIRED_NODE_NAMES = [
  'PistonOscillationInstrument_ROOT',
  'Cylinder_Pyrex',
  'PistonAssembly_MOV',
  'Piston_Graphite',
  'PistonRod',
  'MassPlatform',
  'MassPlatform_UpperPlate',
  'ScaleTicks_0_to_85mm',
  'ScaleLabel_80',
  'ProtectiveFrame_BackSolidInsert',
  'PistonLockingScrew_MovingPart',
  'PistonLockingScrew_KnurledKnob',
  'PressureSensor_ROOT',
  'UniversalInterface_ROOT',
  'UniversalInterface_PowerModule',
  'UniversalInterface_PowerButton',
  'UniversalInterface_PowerButton_DarkSeat',
  'UniversalInterface_PowerButton_InnerBezel',
  'UniversalInterface_PowerButton_UnifiedSymbol',
  'UniversalInterface_PowerRing',
  'UniversalInterface_StatusLED',
  'Hose_Main_Connected',
  'Hose_Main_DisconnectedAssembly',
  'Connector_Main_QuickDisconnect',
  'PistonOscillation_UnifiedLightLabBench',
] as const;

export const clearPistonOscillationInstrumentModelCache = () => {
  useGLTF.clear(PISTON_OSCILLATION_GLB_PATH);
};

export const getRequiredPistonOscillationObject = (
  root: THREE.Object3D,
  nodeName: string,
) => {
  const object = root.getObjectByName(nodeName);
  if (!object) {
    throw new Error(`Piston-oscillation model is missing node: ${nodeName}`);
  }
  return object;
};

export const measurePistonOscillationModel = (
  root: THREE.Object3D,
): PistonOscillationModelBounds => {
  const bounds = new THREE.Box3();
  const transformedMeshBounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    let visibilityCursor: THREE.Object3D | null = object;
    while (visibilityCursor) {
      if (!visibilityCursor.visible) return;
      if (visibilityCursor === root) break;
      visibilityCursor = visibilityCursor.parent;
    }
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    transformedMeshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    bounds.union(transformedMeshBounds);
  });

  if (bounds.isEmpty()) {
    throw new Error('Piston-oscillation model does not contain visible mesh bounds.');
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (![center.x, center.y, center.z, span].every(Number.isFinite) || span <= 0) {
    throw new Error('Piston-oscillation model has invalid bounds.');
  }

  return { center: [center.x, center.y, center.z], span };
};

export interface PistonOscillationModelInstance {
  root: THREE.Object3D;
  ownedMaterials: Set<THREE.Material>;
}

export const createPistonOscillationModelInstance = (
  sourceScene: THREE.Object3D,
): PistonOscillationModelInstance => {
  const root = sourceScene.clone(true);
  const ownedMaterials = new Set<THREE.Material>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.raycast = () => undefined;
    mesh.castShadow = object.name.startsWith('ProtectiveFrame_')
      || object.name.startsWith('MassPlatform')
      || object.name.startsWith('RodClamp')
      || object.name.startsWith('Piston_')
      || object.name === 'PistonRod'
      || object.name === 'SupportRod_45cm'
      || object.name.startsWith('PistonLockingScrew_');
    mesh.receiveShadow = mesh.castShadow
      || object.name.includes('LabBench_Surface');

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => {
        const clone = material.clone();
        ownedMaterials.add(clone);
        return clone;
      });
    } else if (mesh.material) {
      const clone = mesh.material.clone();
      ownedMaterials.add(clone);
      mesh.material = clone;
    }
  });

  getRequiredPistonOscillationObject(root, 'Hose_Main_Connected').visible = true;
  getRequiredPistonOscillationObject(root, 'Hose_Main_DisconnectedAssembly').visible = false;
  root.updateWorldMatrix(true, true);
  return { root, ownedMaterials };
};

export function PistonOscillationInstrumentAsset(props: {
  children: (sourceScene: THREE.Object3D) => React.ReactNode;
}) {
  const gltf = useGLTF(PISTON_OSCILLATION_GLB_PATH);
  const missingNodeNames = useMemo(
    () => PISTON_OSCILLATION_REQUIRED_NODE_NAMES.filter(
      (nodeName) => !gltf.scene.getObjectByName(nodeName),
    ),
    [gltf.scene],
  );

  if (missingNodeNames.length > 0) {
    throw new Error(
      `Piston-oscillation model is missing required nodes: ${missingNodeNames.join(', ')}`,
    );
  }

  return <>{props.children(gltf.scene)}</>;
}

export interface PistonOscillationInstrumentModelProps {
  sourceScene: THREE.Object3D;
  onBoundsReady: (bounds: PistonOscillationModelBounds) => void;
}

export const PistonOscillationInstrumentModel = ({
  sourceScene,
  onBoundsReady,
}: PistonOscillationInstrumentModelProps) => {
  const instance = useMemo(
    () => createPistonOscillationModelInstance(sourceScene),
    [sourceScene],
  );
  const bounds = useMemo(
    () => measurePistonOscillationModel(instance.root),
    [instance.root],
  );

  useLayoutEffect(() => {
    onBoundsReady(bounds);
  }, [bounds, onBoundsReady]);

  useEffect(() => () => {
    instance.ownedMaterials.forEach((material) => material.dispose());
    instance.ownedMaterials.clear();
  }, [instance]);

  return <primitive object={instance.root} dispose={null} />;
};

export default PistonOscillationInstrumentModel;
