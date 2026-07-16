import * as THREE from 'three';

const ULTRA_PUMP_BULB_NODE_NAME = 'Pump_Bulb';
export const HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY =
  'heat-capacity-ultra-single-morph-v1';
const specializedSingleMorphMaterials = new WeakSet<THREE.Material>();

const SINGLE_MORPH_NORMAL_VERTEX_CHUNK = /* glsl */ `
#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	if ( morphTargetInfluences[ 0 ] != 0.0 ) objectNormal += getMorph( gl_VertexID, 0, 1 ).xyz * morphTargetInfluences[ 0 ];
#endif
`;

const SINGLE_MORPH_POSITION_VERTEX_CHUNK = /* glsl */ `
#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	if ( morphTargetInfluences[ 0 ] != 0.0 ) transformed += getMorph( gl_VertexID, 0, 0 ).xyz * morphTargetInfluences[ 0 ];
#endif
`;

export const specializeHeatCapacityUltraSingleMorphVertexShader = (vertexShader: string) => {
  const normalChunk = '#include <morphnormal_vertex>';
  const positionChunk = '#include <morphtarget_vertex>';
  if (!vertexShader.includes(normalChunk) || !vertexShader.includes(positionChunk)) {
    throw new Error('Heat Capacity Ultra single-morph shader chunks are unavailable.');
  }
  return vertexShader
    .replace(normalChunk, SINGLE_MORPH_NORMAL_VERTEX_CHUNK)
    .replace(positionChunk, SINGLE_MORPH_POSITION_VERTEX_CHUNK);
};

export const hasHeatCapacityUltraSingleRelativePositionAndNormalMorph = (
  geometry: THREE.BufferGeometry,
) => {
  const morphAttributes = geometry.morphAttributes;
  const hasAdditionalMorphAttributes = Object.entries(morphAttributes).some(
    ([attributeName, attributes]) =>
      attributeName !== 'position' &&
      attributeName !== 'normal' &&
      (attributes?.length ?? 0) > 0,
  );
  return geometry.morphTargetsRelative &&
    morphAttributes.position?.length === 1 &&
    morphAttributes.normal?.length === 1 &&
    !hasAdditionalMorphAttributes;
};

export const specializeHeatCapacityUltraSingleMorphMaterial = (material: THREE.Material) => {
  if (specializedSingleMorphMaterials.has(material)) return;
  const originalOnBeforeCompile = material.onBeforeCompile;
  const originalProgramCacheKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    originalOnBeforeCompile.call(material, shader, renderer);
    shader.vertexShader = specializeHeatCapacityUltraSingleMorphVertexShader(shader.vertexShader);
  };
  material.customProgramCacheKey = () =>
    `${originalProgramCacheKey}|${HEAT_CAPACITY_ULTRA_SINGLE_MORPH_PROGRAM_CACHE_KEY}`;
  specializedSingleMorphMaterials.add(material);
};

const specializeHeatCapacityUltraPumpBulbMaterials = (mesh: THREE.Mesh) => {
  if (mesh.name !== ULTRA_PUMP_BULB_NODE_NAME ||
      !hasHeatCapacityUltraSingleRelativePositionAndNormalMorph(mesh.geometry)) return;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.filter((material): material is THREE.Material => Boolean(material))
    .forEach(specializeHeatCapacityUltraSingleMorphMaterial);
};

export const cloneHeatCapacityUltraModelScene = (sourceScene: THREE.Object3D) => {
  const clonedScene = sourceScene.clone(true);
  const ownedMaterials = new Set<THREE.Material>();
  clonedScene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
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
    specializeHeatCapacityUltraPumpBulbMaterials(mesh);
  });
  return { root: clonedScene, ownedMaterials };
};

export const disposeHeatCapacityUltraOwnedModelResources = (
  ownedMaterials: Set<THREE.Material>,
) => {
  ownedMaterials.forEach((material) => material.dispose());
  ownedMaterials.clear();
};
