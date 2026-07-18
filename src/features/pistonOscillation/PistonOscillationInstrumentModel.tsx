import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PistonOscillationModelBounds } from './pistonOscillationCameraViews.ts';

export const PISTON_OSCILLATION_GLB_PATH =
  `${import.meta.env.BASE_URL}models/piston-oscillation/EX5531_TD8572A_ratio_specific_heats_final.glb`;

export const PISTON_OSCILLATION_REQUIRED_NODE_NAMES = [
  'Cylinder_Pyrex',
  'PistonAssembly_MOV',
  'Piston_Graphite',
  'PistonRod',
  'MassPlatform_UpperPlate',
  'ScaleTicks_Unnumbered',
  'PressureSensor_ROOT',
  'UniversalInterface_ROOT',
  'Hose_Main_Default',
] as const;

export const clearPistonOscillationInstrumentModelCache = () => {
  useGLTF.clear(PISTON_OSCILLATION_GLB_PATH);
};

const clonePistonOscillationInstrumentScene = (sourceScene: THREE.Object3D) => {
  const root = sourceScene.clone(true);
  const ownedMaterials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (object.name.startsWith('COL_') || object.userData.collider) {
      object.visible = false;
    }

    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => undefined;

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => {
        const clonedMaterial = material.clone();
        ownedMaterials.add(clonedMaterial);
        return clonedMaterial;
      });
    } else if (mesh.material) {
      const clonedMaterial = mesh.material.clone();
      ownedMaterials.add(clonedMaterial);
      mesh.material = clonedMaterial;
    }
  });

  return { root, ownedMaterials };
};

const measurePistonOscillationModel = (root: THREE.Object3D): PistonOscillationModelBounds => {
  const bounds = new THREE.Box3();
  const transformedMeshBounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!object.visible || !mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    transformedMeshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    bounds.union(transformedMeshBounds);
  });

  if (bounds.isEmpty()) {
    throw new Error('Piston-oscillation GLB does not contain visible mesh bounds.');
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (![center.x, center.y, center.z, span].every(Number.isFinite) || span <= 0) {
    throw new Error('Piston-oscillation GLB has invalid model bounds.');
  }

  return {
    center: [center.x, center.y, center.z],
    span,
  };
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
      `Piston-oscillation GLB is missing required nodes: ${missingNodeNames.join(', ')}`,
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
  const ownedModel = useMemo(
    () => clonePistonOscillationInstrumentScene(sourceScene),
    [sourceScene],
  );
  const bounds = useMemo(
    () => measurePistonOscillationModel(ownedModel.root),
    [ownedModel],
  );

  useLayoutEffect(() => {
    onBoundsReady(bounds);
  }, [bounds, onBoundsReady]);

  useEffect(() => () => {
    ownedModel.ownedMaterials.forEach((material) => material.dispose());
    ownedModel.ownedMaterials.clear();
  }, [ownedModel]);

  return <primitive object={ownedModel.root} dispose={null} />;
};

export default PistonOscillationInstrumentModel;
