import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PistonOscillationModelBounds } from './pistonOscillationCameraViews.ts';

export const PISTON_OSCILLATION_GLB_PATH =
  `${import.meta.env.BASE_URL}models/piston-oscillation/EX5531_TD8572A_ratio_specific_heats_final.glb`;
export const PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_GLB_PATH =
  `${import.meta.env.BASE_URL}models/shared/unified-light-lab-bench.glb`;

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
export const PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_REQUIRED_NODE_NAMES = [
  'Unified_Light_LabBench',
  'Unified_Light_LabBench_Surface',
  'Unified_Light_LabBench_Backstop',
] as const;
export const PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM = {
  position: [-0.1, 0, -0.1146875],
  scale: [0.19230769230769232, 0.16666666666666666, 0.28125],
} as const;
const PISTON_OSCILLATION_SOURCE_TABLETOP_NODE_NAME = 'Tabletop';

export const clearPistonOscillationInstrumentModelCache = () => {
  useGLTF.clear(PISTON_OSCILLATION_GLB_PATH);
  useGLTF.clear(PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_GLB_PATH);
};

const clonePistonOscillationInstrumentScene = (
  sourceScene: THREE.Object3D,
  unifiedLightLabBenchSourceScene: THREE.Object3D,
) => {
  const root = sourceScene.clone(true);
  const sourceTabletop = root.getObjectByName(PISTON_OSCILLATION_SOURCE_TABLETOP_NODE_NAME);
  if (!sourceTabletop) {
    throw new Error(
      `Piston-oscillation GLB is missing source tabletop node: ${PISTON_OSCILLATION_SOURCE_TABLETOP_NODE_NAME}`,
    );
  }
  sourceTabletop.visible = false;

  const unifiedLightLabBench = unifiedLightLabBenchSourceScene.clone(true);
  unifiedLightLabBench.name = 'PistonOscillation_UnifiedLightLabBench_Runtime';
  unifiedLightLabBench.position.set(...PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM.position);
  unifiedLightLabBench.scale.set(...PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM.scale);
  root.add(unifiedLightLabBench);

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
  children: (
    sourceScene: THREE.Object3D,
    unifiedLightLabBenchSourceScene: THREE.Object3D,
  ) => React.ReactNode;
}) {
  const gltf = useGLTF(PISTON_OSCILLATION_GLB_PATH);
  const unifiedLightLabBenchGltf = useGLTF(
    PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_GLB_PATH,
  );
  const missingNodeNames = useMemo(
    () => [
      ...PISTON_OSCILLATION_REQUIRED_NODE_NAMES,
      PISTON_OSCILLATION_SOURCE_TABLETOP_NODE_NAME,
    ].filter((nodeName) => !gltf.scene.getObjectByName(nodeName)),
    [gltf.scene],
  );
  const missingUnifiedLightLabBenchNodeNames = useMemo(
    () => PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_REQUIRED_NODE_NAMES.filter(
      (nodeName) => !unifiedLightLabBenchGltf.scene.getObjectByName(nodeName),
    ),
    [unifiedLightLabBenchGltf.scene],
  );

  if (missingNodeNames.length > 0) {
    throw new Error(
      `Piston-oscillation GLB is missing required nodes: ${missingNodeNames.join(', ')}`,
    );
  }
  if (missingUnifiedLightLabBenchNodeNames.length > 0) {
    throw new Error(
      `Unified light lab bench GLB is missing required nodes: ${missingUnifiedLightLabBenchNodeNames.join(', ')}`,
    );
  }

  return <>{props.children(gltf.scene, unifiedLightLabBenchGltf.scene)}</>;
}

export interface PistonOscillationInstrumentModelProps {
  sourceScene: THREE.Object3D;
  unifiedLightLabBenchSourceScene: THREE.Object3D;
  onBoundsReady: (bounds: PistonOscillationModelBounds) => void;
}

export const PistonOscillationInstrumentModel = ({
  sourceScene,
  unifiedLightLabBenchSourceScene,
  onBoundsReady,
}: PistonOscillationInstrumentModelProps) => {
  const ownedModel = useMemo(
    () => clonePistonOscillationInstrumentScene(sourceScene, unifiedLightLabBenchSourceScene),
    [sourceScene, unifiedLightLabBenchSourceScene],
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
