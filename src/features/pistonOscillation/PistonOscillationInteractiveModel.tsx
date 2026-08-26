import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createPistonOscillationModelInstance,
  getRequiredPistonOscillationObject,
  measurePistonOscillationModel,
} from './PistonOscillationInstrumentModel.tsx';
import { PISTON_MODEL_HIT_TARGETS } from './pistonOscillationModelHitTargets.ts';
import {
  PISTON_MODEL_VERTICAL_AXIS,
  PISTON_SCALE_CALIBRATION_HEIGHT_MM,
  getPistonAssemblyTargetWorldY,
} from './pistonOscillationModelMotion.ts';

export const PISTON_OSCILLATION_LOCKING_SCREW_TURNS = 6;
export const PISTON_OSCILLATION_LOCKING_SCREW_TRAVEL_M = 0.004;
export const PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS = 3;
export const PISTON_OSCILLATION_HOSE_MAGNETIC_SNAP_RADIUS_M = 0.06;
export const PISTON_OSCILLATION_HOSE_CONNECTOR_HIT_RADIUS_M = 0.048;
export const PISTON_OSCILLATION_HOSE_BODY_HIT_RADIUS_SCALE = 3.2;
export const PISTON_OSCILLATION_HOSE_HANDLE_ARC_LENGTH_M = 0.11;
export const PISTON_OSCILLATION_HOSE_HANDLE_HIT_PADDING_M = 0.018;

export type PistonOscillationHoseState = 'connected' | 'disconnected';

export type PistonOscillationDemoFocusTarget = 'platform' | 'screw' | 'hose' | null;

export type PistonOscillationDemoGuideTheme = 'light' | 'dark';

export interface PistonOscillationInteractiveBounds {
  center: THREE.Vector3;
  span: number;
}

interface InteractiveHitTargets {
  connectedConnector: THREE.Mesh;
  connectedHandle: THREE.Group;
  connectedBody: THREE.Mesh;
  detachedConnector: THREE.Mesh;
  detachedHandle: THREE.Group;
  detachedBody: THREE.Mesh;
  pistonPlatform: THREE.Mesh;
  pistonCylinder: THREE.Mesh;
  pistonFrame: THREE.Mesh;
  pistonLockingScrew: THREE.Mesh;
}

interface InteractiveModelInstance {
  root: THREE.Object3D;
  bounds: PistonOscillationInteractiveBounds;
  ownedMaterials: Set<THREE.Material>;
  ownedGeometries: Set<THREE.BufferGeometry>;
  pistonAssembly: THREE.Object3D;
  massPlatform: THREE.Object3D;
  pistonAssemblyWorldYAtScaleCalibration: number;
  lockingScrewMovingPart: THREE.Object3D;
  connectedHose: THREE.Object3D;
  quickDisconnect: THREE.Object3D;
  connectedMovableConnector: THREE.Object3D;
  connectedInternalConnector: THREE.Object3D;
  detachedHoseAssembly: THREE.Object3D;
  detachedHose: THREE.Object3D;
  detachedConnector: THREE.Object3D;
  ghostAssembly: THREE.Group;
  connectedGhostAssembly: THREE.Group;
  detachedGhostAssembly: THREE.Group;
  hitTargets: InteractiveHitTargets;
  snapRing: THREE.Mesh;
  connectedConnectorWorldPosition: THREE.Vector3;
  detachedConnectorWorldPosition: THREE.Vector3;
  detachedToConnectedLocalOffset: THREE.Vector3;
  focusShellBreathMaterial: THREE.MeshBasicMaterial;
  focusShellPulseMaterial: THREE.MeshBasicMaterial;
  focusShells: {
    platform: FocusShellInstance;
    screw: FocusShellInstance;
    connectedHoseHandle: FocusShellInstance;
    detachedHoseHandle: FocusShellInstance;
  };
}

interface FocusShellInstance {
  anchor: THREE.Object3D | null;
  anchorGroup: THREE.Group;
  breathGroup: THREE.Group;
  pulseGroup: THREE.Group;
}

interface PistonFocusShellPalette {
  color: string;
  rimColor: string;
  blending: THREE.Blending;
  breathMinOpacity: number;
  breathMaxOpacity: number;
  pulseOpacity: number;
  baseScale: number;
  breathScale: number;
  pulseStartScale: number;
  pulseRate: number;
  guideMinOpacity: number;
  guideMaxOpacity: number;
  guideBaseScale: number;
  guidePulseScale: number;
}

const PISTON_FOCUS_SHELL_PALETTES: Record<
  PistonOscillationDemoGuideTheme,
  PistonFocusShellPalette
> = {
  light: {
    color: '#0ea5e9',
    rimColor: '#22d3ee',
    blending: THREE.NormalBlending,
    breathMinOpacity: 0.13,
    breathMaxOpacity: 0.3,
    pulseOpacity: 0.38,
    baseScale: 1.028,
    breathScale: 0.036,
    pulseStartScale: 1.055,
    pulseRate: 0.52,
    guideMinOpacity: 0.4,
    guideMaxOpacity: 0.78,
    guideBaseScale: 1.06,
    guidePulseScale: 0.2,
  },
  dark: {
    color: '#67e8f9',
    rimColor: '#a5f3fc',
    blending: THREE.AdditiveBlending,
    breathMinOpacity: 0.11,
    breathMaxOpacity: 0.26,
    pulseOpacity: 0.38,
    baseScale: 1.03,
    breathScale: 0.04,
    pulseStartScale: 1.055,
    pulseRate: 0.54,
    guideMinOpacity: 0.32,
    guideMaxOpacity: 0.68,
    guideBaseScale: 1.06,
    guidePulseScale: 0.18,
  },
};

const PISTON_FOCUS_SHELL_PULSE_PEAK_SCALE: Record<
  Exclude<PistonOscillationDemoFocusTarget, null>,
  number
> = {
  platform: 1.11,
  screw: 1.34,
  hose: 1.11,
};

const getPistonGuideCuePulse = (
  elapsedSeconds: number,
  cyclesPerSecond: number,
) => 0.5 - 0.5 * Math.cos(
  Math.max(0, elapsedSeconds) * Math.PI * 2 * cyclesPerSecond,
);

const createRadiallyExpandedTubeGeometry = (
  geometry: THREE.BufferGeometry,
  radiusScale: number,
) => {
  const expanded = geometry.clone();
  const positions = expanded.getAttribute('position');
  const uvs = expanded.getAttribute('uv');
  if (!positions || !uvs || positions.count !== uvs.count) {
    expanded.computeBoundingBox();
    expanded.computeBoundingSphere();
    return expanded;
  }

  const ringCenter = new THREE.Vector3();
  const firstPosition = new THREE.Vector3();
  const lastPosition = new THREE.Vector3();
  const vertexPosition = new THREE.Vector3();
  let ringStart = 0;

  while (ringStart < uvs.count) {
    const ringU = uvs.getX(ringStart);
    let ringEnd = ringStart + 1;
    while (ringEnd < uvs.count && Math.abs(uvs.getX(ringEnd) - ringU) < 1e-6) {
      ringEnd += 1;
    }

    firstPosition.fromBufferAttribute(positions, ringStart);
    lastPosition.fromBufferAttribute(positions, ringEnd - 1);
    const uniqueRingEnd = firstPosition.distanceToSquared(lastPosition) < 1e-12
      ? ringEnd - 1
      : ringEnd;
    const ringVertexCount = uniqueRingEnd - ringStart;
    if (ringVertexCount >= 3) {
      ringCenter.set(0, 0, 0);
      for (let index = ringStart; index < uniqueRingEnd; index += 1) {
        ringCenter.add(vertexPosition.fromBufferAttribute(positions, index));
      }
      ringCenter.multiplyScalar(1 / ringVertexCount);

      for (let index = ringStart; index < ringEnd; index += 1) {
        vertexPosition
          .fromBufferAttribute(positions, index)
          .sub(ringCenter)
          .multiplyScalar(radiusScale)
          .add(ringCenter);
        positions.setXYZ(index, vertexPosition.x, vertexPosition.y, vertexPosition.z);
      }
    }

    ringStart = ringEnd;
  }

  positions.needsUpdate = true;
  expanded.computeBoundingBox();
  expanded.computeBoundingSphere();
  return expanded;
};

const copyWorldTransformToRoot = (
  source: THREE.Object3D,
  clone: THREE.Object3D,
  root: THREE.Object3D,
) => {
  root.updateWorldMatrix(true, true);
  source.updateWorldMatrix(true, true);
  const localMatrix = root.matrixWorld.clone().invert().multiply(source.matrixWorld);
  localMatrix.decompose(clone.position, clone.quaternion, clone.scale);
};

const applyGhostMaterial = (
  root: THREE.Object3D,
  material: THREE.Material,
) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = material;
    mesh.raycast = () => undefined;
    mesh.renderOrder = 60;
  });
};

const createBodyHitTarget = (
  root: THREE.Object3D,
  source: THREE.Object3D,
  objectName: string,
  material: THREE.Material,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const sourceMesh = source as THREE.Mesh;
  if (!sourceMesh.isMesh || !sourceMesh.geometry) {
    throw new Error(`Piston-oscillation hose node is not a mesh: ${source.name}`);
  }
  const geometry = createRadiallyExpandedTubeGeometry(
    sourceMesh.geometry,
    PISTON_OSCILLATION_HOSE_BODY_HIT_RADIUS_SCALE,
  );
  ownedGeometries.add(geometry);
  const hitTarget = new THREE.Mesh(geometry, material);
  hitTarget.name = objectName;
  hitTarget.raycast = THREE.Mesh.prototype.raycast;
  hitTarget.renderOrder = 40;
  copyWorldTransformToRoot(source, hitTarget, root);
  root.add(hitTarget);
  return hitTarget;
};

const createConnectorHitTarget = (
  root: THREE.Object3D,
  source: THREE.Object3D,
  objectName: string,
  material: THREE.Material,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const geometry = new THREE.SphereGeometry(
    PISTON_OSCILLATION_HOSE_CONNECTOR_HIT_RADIUS_M,
    20,
    14,
  );
  ownedGeometries.add(geometry);
  const hitTarget = new THREE.Mesh(geometry, material);
  hitTarget.name = objectName;
  hitTarget.position.copy(
    root.worldToLocal(new THREE.Box3().setFromObject(source).getCenter(new THREE.Vector3())),
  );
  hitTarget.raycast = THREE.Mesh.prototype.raycast;
  hitTarget.renderOrder = 40;
  root.add(hitTarget);
  return hitTarget;
};

const createHoseHandleHitTarget = (
  root: THREE.Object3D,
  hose: THREE.Object3D,
  connector: THREE.Object3D,
  objectName: string,
  material: THREE.Material,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const hoseMesh = hose as THREE.Mesh;
  if (!hoseMesh.isMesh || !hoseMesh.geometry) {
    throw new Error(`Piston-oscillation hose node is not a mesh: ${hose.name}`);
  }
  root.updateWorldMatrix(true, true);
  hoseMesh.updateWorldMatrix(true, false);
  connector.updateWorldMatrix(true, true);
  const connectorBounds = new THREE.Box3().setFromObject(connector, true);
  const connectorCenter = connectorBounds.getCenter(new THREE.Vector3());
  const positions = hoseMesh.geometry.getAttribute('position');
  const uvs = hoseMesh.geometry.getAttribute('uv');
  const localPoint = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();
  const handlePathWorldCenters: THREE.Vector3[] = [];
  if (positions && uvs && positions.count === uvs.count) {
    const rings: Array<{
      start: number;
      end: number;
      worldCenter: THREE.Vector3;
    }> = [];
    let ringStart = 0;
    while (ringStart < uvs.count) {
      const ringU = uvs.getX(ringStart);
      let ringEnd = ringStart + 1;
      while (ringEnd < uvs.count && Math.abs(uvs.getX(ringEnd) - ringU) < 1e-6) {
        ringEnd += 1;
      }

      const firstPosition = new THREE.Vector3().fromBufferAttribute(positions, ringStart);
      const lastPosition = new THREE.Vector3().fromBufferAttribute(positions, ringEnd - 1);
      const uniqueRingEnd = firstPosition.distanceToSquared(lastPosition) < 1e-12
        ? ringEnd - 1
        : ringEnd;
      const ringVertexCount = Math.max(1, uniqueRingEnd - ringStart);
      const worldCenter = new THREE.Vector3();
      for (let index = ringStart; index < uniqueRingEnd; index += 1) {
        localPoint.fromBufferAttribute(positions, index);
        worldCenter.add(worldPoint.copy(localPoint).applyMatrix4(hoseMesh.matrixWorld));
      }
      worldCenter.multiplyScalar(1 / ringVertexCount);
      rings.push({ start: ringStart, end: ringEnd, worldCenter });
      ringStart = ringEnd;
    }

    if (rings.length > 0) {
      const firstDistance = rings[0].worldCenter.distanceTo(connectorCenter);
      const lastDistance = rings[rings.length - 1].worldCenter.distanceTo(connectorCenter);
      const connectorRingIndex = firstDistance <= lastDistance ? 0 : rings.length - 1;
      const direction = connectorRingIndex === 0 ? 1 : -1;
      let ringIndex = connectorRingIndex;
      let travelled = 0;
      let previousCenter: THREE.Vector3 | null = null;
      while (ringIndex >= 0 && ringIndex < rings.length) {
        const ring = rings[ringIndex];
        if (previousCenter) {
          travelled += previousCenter.distanceTo(ring.worldCenter);
          if (travelled > PISTON_OSCILLATION_HOSE_HANDLE_ARC_LENGTH_M) break;
        }
        handlePathWorldCenters.push(ring.worldCenter);
        previousCenter = ring.worldCenter;
        ringIndex += direction;
      }
    }
  }

  const hitTarget = new THREE.Group();
  hitTarget.name = objectName;
  const connectorGeometry = new THREE.SphereGeometry(
    PISTON_OSCILLATION_HOSE_CONNECTOR_HIT_RADIUS_M,
    16,
    10,
  );
  const segmentGeometry = new THREE.BoxGeometry(1, 1, 1);
  ownedGeometries.add(connectorGeometry);
  ownedGeometries.add(segmentGeometry);

  const connectorTarget = new THREE.Mesh(connectorGeometry, material);
  connectorTarget.name = `${objectName}_Connector`;
  connectorTarget.position.copy(root.worldToLocal(connectorCenter.clone()));
  connectorTarget.raycast = THREE.Mesh.prototype.raycast;
  connectorTarget.renderOrder = 41;
  hitTarget.add(connectorTarget);

  const sampledWorldCenters: THREE.Vector3[] = [];
  for (let index = 0; index < handlePathWorldCenters.length; index += 1) {
    const center = handlePathWorldCenters[index];
    const lastSample = sampledWorldCenters[sampledWorldCenters.length - 1];
    const isLast = index === handlePathWorldCenters.length - 1;
    if (!lastSample
      || isLast
      || lastSample.distanceTo(center) >= PISTON_OSCILLATION_HOSE_HANDLE_HIT_PADDING_M) {
      sampledWorldCenters.push(center);
    }
  }
  const segmentThickness = PISTON_OSCILLATION_HOSE_HANDLE_HIT_PADDING_M * 2;
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (let index = 1; index < sampledWorldCenters.length; index += 1) {
    const segmentStart = root.worldToLocal(sampledWorldCenters[index - 1].clone());
    const segmentEnd = root.worldToLocal(sampledWorldCenters[index].clone());
    const segmentDirection = segmentEnd.clone().sub(segmentStart);
    const segmentLength = segmentDirection.length();
    if (segmentLength <= Number.EPSILON) continue;
    const segmentTarget = new THREE.Mesh(segmentGeometry, material);
    segmentTarget.name = `${objectName}_Segment_${index}`;
    segmentTarget.position.copy(segmentStart).add(segmentEnd).multiplyScalar(0.5);
    segmentTarget.quaternion.setFromUnitVectors(
      zAxis,
      segmentDirection.multiplyScalar(1 / segmentLength),
    );
    segmentTarget.scale.set(
      segmentThickness,
      segmentThickness,
      segmentLength + segmentThickness,
    );
    segmentTarget.raycast = THREE.Mesh.prototype.raycast;
    segmentTarget.renderOrder = 41;
    hitTarget.add(segmentTarget);
  }
  root.add(hitTarget);
  return hitTarget;
};

const syncBoxHitTarget = (
  root: THREE.Object3D,
  source: THREE.Object3D,
  hitTarget: THREE.Mesh,
) => {
  root.updateWorldMatrix(true, true);
  source.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(source, true);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  hitTarget.position.copy(root.worldToLocal(center));
  hitTarget.scale.set(size.x + 0.018, size.y + 0.012, size.z + 0.018);
  hitTarget.updateWorldMatrix(true, true);
};

const createBoxHitTarget = (
  root: THREE.Object3D,
  source: THREE.Object3D,
  objectName: string,
  material: THREE.Material,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  ownedGeometries.add(geometry);
  const hitTarget = new THREE.Mesh(geometry, material);
  hitTarget.name = objectName;
  hitTarget.raycast = THREE.Mesh.prototype.raycast;
  hitTarget.renderOrder = 40;
  root.add(hitTarget);
  syncBoxHitTarget(root, source, hitTarget);
  return hitTarget;
};

const createFocusShellMaterial = (
  color: string,
  opacity: number,
  polygonOffsetFactor: number,
) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity,
  depthWrite: false,
  depthTest: true,
  side: THREE.BackSide,
  blending: THREE.NormalBlending,
  polygonOffset: true,
  polygonOffsetFactor,
  polygonOffsetUnits: polygonOffsetFactor,
  toneMapped: false,
});

const collectFocusShellSourceMeshes = (
  sources: readonly THREE.Object3D[],
) => {
  const visited = new Set<THREE.Mesh>();
  const meshes: THREE.Mesh[] = [];
  sources.forEach((source) => {
    source.updateWorldMatrix(true, true);
    source.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || visited.has(mesh)) return;
      visited.add(mesh);
      meshes.push(mesh);
    });
  });
  return meshes;
};

const createFocusShellInstance = (
  root: THREE.Object3D,
  name: string,
  sources: readonly THREE.Object3D[],
  anchor: THREE.Object3D | null,
  breathMaterial: THREE.MeshBasicMaterial,
  pulseMaterial: THREE.MeshBasicMaterial,
): FocusShellInstance => {
  root.updateWorldMatrix(true, true);
  anchor?.updateWorldMatrix(true, true);
  const sourceMeshes = collectFocusShellSourceMeshes(sources);
  const anchorWorldMatrix = anchor
    ? anchor.matrixWorld.clone()
    : new THREE.Matrix4().makeTranslation(
      ...new THREE.Box3()
        .setFromObject(sources[0], true)
        .union(
          sources.slice(1).reduce(
            (bounds, source) => bounds.union(new THREE.Box3().setFromObject(source, true)),
            new THREE.Box3(),
          ),
        )
        .getCenter(new THREE.Vector3())
        .toArray() as [number, number, number],
    );
  const anchorInverseMatrix = anchorWorldMatrix.clone().invert();
  const rootInverseMatrix = root.matrixWorld.clone().invert();
  const anchorGroup = new THREE.Group();
  anchorGroup.name = `PistonDemoFocusShellAnchor_${name}`;
  anchorGroup.matrixAutoUpdate = false;
  anchorGroup.matrix.multiplyMatrices(rootInverseMatrix, anchorWorldMatrix);
  anchorGroup.visible = false;

  const breathGroup = new THREE.Group();
  breathGroup.name = `PistonDemoFocusShellBreath_${name}`;
  const pulseGroup = new THREE.Group();
  pulseGroup.name = `PistonDemoFocusShellPulse_${name}`;

  sourceMeshes.forEach((sourceMesh, index) => {
    sourceMesh.updateWorldMatrix(true, false);
    const sourceMatrix = new THREE.Matrix4().multiplyMatrices(
      anchorInverseMatrix,
      sourceMesh.matrixWorld,
    );
    const breathMesh = new THREE.Mesh(sourceMesh.geometry, breathMaterial);
    breathMesh.name = `PistonDemoFocusShellBreathMesh_${name}_${index}`;
    breathMesh.matrixAutoUpdate = false;
    breathMesh.matrix.copy(sourceMatrix);
    breathMesh.renderOrder = 24;
    breathMesh.raycast = () => undefined;
    breathMesh.updateMorphTargets();
    if (
      sourceMesh.morphTargetInfluences
      && breathMesh.morphTargetInfluences?.length === sourceMesh.morphTargetInfluences.length
    ) {
      breathMesh.morphTargetInfluences = sourceMesh.morphTargetInfluences;
    }

    const pulseMesh = new THREE.Mesh(sourceMesh.geometry, pulseMaterial);
    pulseMesh.name = `PistonDemoFocusShellPulseMesh_${name}_${index}`;
    pulseMesh.matrixAutoUpdate = false;
    pulseMesh.matrix.copy(sourceMatrix);
    pulseMesh.renderOrder = 25;
    pulseMesh.raycast = () => undefined;
    pulseMesh.updateMorphTargets();
    if (
      sourceMesh.morphTargetInfluences
      && pulseMesh.morphTargetInfluences?.length === sourceMesh.morphTargetInfluences.length
    ) {
      pulseMesh.morphTargetInfluences = sourceMesh.morphTargetInfluences;
    }

    breathGroup.add(breathMesh);
    pulseGroup.add(pulseMesh);
  });

  anchorGroup.add(breathGroup, pulseGroup);
  root.add(anchorGroup);
  anchorGroup.updateMatrixWorld(true);
  return {
    anchor,
    anchorGroup,
    breathGroup,
    pulseGroup,
  };
};

const syncFocusShellAnchor = (
  root: THREE.Object3D,
  shell: FocusShellInstance,
) => {
  if (!shell.anchor) return;
  root.updateWorldMatrix(true, false);
  shell.anchor.updateWorldMatrix(true, false);
  shell.anchorGroup.matrix.multiplyMatrices(
    root.matrixWorld.clone().invert(),
    shell.anchor.matrixWorld,
  );
  shell.anchorGroup.matrixWorldNeedsUpdate = true;
};

const SCALE_READING_MAIN_TICK_NODE_NAMES = [
  'ScaleTicks_Major_10mm',
  'ScaleTicks_Middle_5mm',
  'ScaleTicks_Minor_1mm',
] as const;

const SCALE_READING_TICK_OUTLINE_NODE_NAMES = [
  'ScaleTicks_Major_10mm_DarkOutline',
  'ScaleTicks_Middle_5mm_DarkOutline',
  'ScaleTicks_Minor_1mm_DarkOutline',
] as const;

const SCALE_READING_GRAPHITE_BOTTOM_BLUE = new THREE.Color('#b2deee');
const SCALE_READING_GRAPHITE_TOP_BLACK = new THREE.Color('#030607');

const createScaleReadingGraphiteMaterial = (source: THREE.Material) => {
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.65,
    emissive: '#000000',
    emissiveIntensity: 0,
    vertexColors: true,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
  });
  material.name = `${source.name || 'Graphite'}_ScaleReadingDetail`;
  return material;
};

const createScaleReadingTickMaterial = (source: THREE.Material) => {
  const material = source instanceof THREE.MeshBasicMaterial
    ? source.clone()
    : new THREE.MeshBasicMaterial({
      side: source.side,
      transparent: source.transparent,
      opacity: source.opacity,
      depthTest: source.depthTest,
      depthWrite: source.depthWrite,
    });
  material.color.set('#ffffff');
  material.toneMapped = false;
  material.name = `${source.name || 'ScaleTick'}_PureWhite`;
  material.needsUpdate = true;
  return material;
};

const createScaleReadingGlassMaterial = (source: THREE.Material) => {
  const material = source instanceof THREE.MeshPhysicalMaterial
    ? source.clone()
    : new THREE.MeshPhysicalMaterial();
  material.color.set('#c8e6ee');
  material.metalness = 0;
  material.roughness = 0.09;
  material.transmission = 0.9;
  material.opacity = 0.32;
  material.thickness = 0.0035;
  material.ior = 1.47;
  material.clearcoat = 0.5;
  material.clearcoatRoughness = 0.16;
  material.specularIntensity = 0.9;
  material.side = source.side;
  material.transparent = true;
  material.depthTest = source.depthTest;
  material.depthWrite = false;
  material.name = `${source.name || 'Pyrex'}_ScaleReadingDetail`;
  material.needsUpdate = true;
  return material;
};

const replaceObjectMaterials = (
  object: THREE.Object3D,
  ownedMaterials: Set<THREE.Material>,
  createMaterial: (source: THREE.Material) => THREE.Material,
) => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const replaceMaterial = (source: THREE.Material) => {
      const material = createMaterial(source);
      ownedMaterials.add(material);
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(replaceMaterial)
      : replaceMaterial(mesh.material);
  });
};

const applyScaleReadingVisualEnhancement = (
  root: THREE.Object3D,
  ownedMaterials: Set<THREE.Material>,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const graphitePiston = getRequiredPistonOscillationObject(root, 'Piston_Graphite');
  const glassCylinder = getRequiredPistonOscillationObject(root, 'Cylinder_Pyrex');
  replaceObjectMaterials(
    graphitePiston,
    ownedMaterials,
    createScaleReadingGraphiteMaterial,
  );
  graphitePiston.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geometry = mesh.geometry.clone();
    const position = geometry.getAttribute('position');
    geometry.computeBoundingBox();
    const minimumY = geometry.boundingBox?.min.y ?? 0;
    const maximumY = geometry.boundingBox?.max.y ?? minimumY;
    const height = Math.max(maximumY - minimumY, Number.EPSILON);
    const colors = new Float32Array(position.count * 3);
    const color = new THREE.Color();
    for (let index = 0; index < position.count; index += 1) {
      const normalizedY = THREE.MathUtils.clamp(
        (position.getY(index) - minimumY) / height,
        0,
        1,
      );
      color.lerpColors(
        SCALE_READING_GRAPHITE_BOTTOM_BLUE,
        SCALE_READING_GRAPHITE_TOP_BLACK,
        normalizedY,
      );
      color.toArray(colors, index * 3);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mesh.geometry = geometry;
    ownedGeometries.add(geometry);
  });
  replaceObjectMaterials(
    glassCylinder,
    ownedMaterials,
    createScaleReadingGlassMaterial,
  );

  SCALE_READING_TICK_OUTLINE_NODE_NAMES.forEach((nodeName) => {
    getRequiredPistonOscillationObject(root, nodeName).visible = false;
  });

  SCALE_READING_MAIN_TICK_NODE_NAMES.forEach((nodeName) => {
    const tickObject = getRequiredPistonOscillationObject(root, nodeName);
    replaceObjectMaterials(
      tickObject,
      ownedMaterials,
      createScaleReadingTickMaterial,
    );
    tickObject.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const geometry = mesh.geometry.clone();
      geometry.computeBoundingBox();
      const centerY = geometry.boundingBox?.getCenter(new THREE.Vector3()).y ?? 0;
      geometry.translate(0, -centerY, 0);
      geometry.scale(1, 0.45, 1);
      geometry.translate(0, centerY, 0);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      mesh.geometry = geometry;
      ownedGeometries.add(geometry);
    });
  });
};

const createInteractiveModelInstance = (
  sourceScene: THREE.Object3D,
  scaleReadingVisualEnhancement: boolean,
): InteractiveModelInstance => {
  const base = createPistonOscillationModelInstance(sourceScene);
  const { root, ownedMaterials } = base;
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  if (scaleReadingVisualEnhancement) {
    applyScaleReadingVisualEnhancement(root, ownedMaterials, ownedGeometries);
  }
  const pistonAssembly = getRequiredPistonOscillationObject(root, 'PistonAssembly_MOV');
  const massPlatform = getRequiredPistonOscillationObject(root, 'MassPlatform');
  const glassCylinder = getRequiredPistonOscillationObject(root, 'Cylinder_Pyrex');
  const protectiveFrame = getRequiredPistonOscillationObject(root, 'ProtectiveFrame');
  const lockingScrewMovingPart = getRequiredPistonOscillationObject(
    root,
    'PistonLockingScrew_MovingPart',
  );
  const connectedHose = getRequiredPistonOscillationObject(root, 'Hose_Main_Connected');
  const quickDisconnect = getRequiredPistonOscillationObject(
    root,
    'Connector_Main_QuickDisconnect',
  );
  const connectedMovableConnector = getRequiredPistonOscillationObject(
    quickDisconnect,
    'Connector_Main_White',
  );
  const connectedInternalConnector = getRequiredPistonOscillationObject(
    quickDisconnect,
    'Connector_Main_ThreadedStem',
  );
  const detachedHoseAssembly = getRequiredPistonOscillationObject(
    root,
    'Hose_Main_DisconnectedAssembly',
  );
  const detachedHose = getRequiredPistonOscillationObject(
    detachedHoseAssembly,
    'Hose_Main_Disconnected',
  );
  const detachedConnector = getRequiredPistonOscillationObject(
    detachedHoseAssembly,
    'Detached_Main_QuickDisconnect',
  );

  root.updateWorldMatrix(true, true);
  const measured = measurePistonOscillationModel(root);
  const bounds = {
    center: new THREE.Vector3(...measured.center),
    span: measured.span,
  };
  const connectedConnectorWorldPosition = new THREE.Box3()
    .setFromObject(connectedMovableConnector)
    .getCenter(new THREE.Vector3());
  const detachedConnectorWorldPosition = new THREE.Box3()
    .setFromObject(detachedConnector)
    .getCenter(new THREE.Vector3());
  const detachedToConnectedLocalOffset = root
    .worldToLocal(connectedConnectorWorldPosition.clone())
    .sub(root.worldToLocal(detachedConnectorWorldPosition.clone()));

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: '#69b7df',
    roughness: 0.48,
    metalness: 0.04,
    transparent: true,
    opacity: 0.32,
    depthTest: false,
    depthWrite: false,
  });
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const snapRingMaterial = new THREE.MeshBasicMaterial({
    color: '#3f9dcc',
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
  });
  const focusShellBreathMaterial = createFocusShellMaterial(
    PISTON_FOCUS_SHELL_PALETTES.light.color,
    PISTON_FOCUS_SHELL_PALETTES.light.breathMinOpacity,
    -4,
  );
  const focusShellPulseMaterial = createFocusShellMaterial(
    PISTON_FOCUS_SHELL_PALETTES.light.rimColor,
    0,
    -8,
  );
  ownedMaterials.add(ghostMaterial);
  ownedMaterials.add(hitMaterial);
  ownedMaterials.add(snapRingMaterial);
  ownedMaterials.add(focusShellBreathMaterial);
  ownedMaterials.add(focusShellPulseMaterial);

  const ghostAssembly = new THREE.Group();
  ghostAssembly.name = 'Hose_Main_DragGhostAssembly';
  const connectedGhostAssembly = new THREE.Group();
  connectedGhostAssembly.name = 'Hose_Main_ConnectedDragGhostAssembly';
  const connectedHoseGhost = connectedHose.clone(true);
  connectedHoseGhost.name = 'Hose_Main_ConnectedDragGhost';
  copyWorldTransformToRoot(connectedHose, connectedHoseGhost, root);
  const connectedConnectorGhost = connectedMovableConnector.clone(true);
  connectedConnectorGhost.name = 'Connector_Main_DragGhost';
  copyWorldTransformToRoot(connectedMovableConnector, connectedConnectorGhost, root);
  applyGhostMaterial(connectedHoseGhost, ghostMaterial);
  applyGhostMaterial(connectedConnectorGhost, ghostMaterial);
  connectedGhostAssembly.add(connectedHoseGhost, connectedConnectorGhost);

  const detachedGhostAssembly = detachedHoseAssembly.clone(true) as THREE.Group;
  detachedGhostAssembly.name = 'Hose_Main_DisconnectedDragGhostAssembly';
  copyWorldTransformToRoot(detachedHoseAssembly, detachedGhostAssembly, root);
  applyGhostMaterial(detachedGhostAssembly, ghostMaterial);
  ghostAssembly.add(connectedGhostAssembly, detachedGhostAssembly);
  ghostAssembly.visible = false;
  root.add(ghostAssembly);

  const hitTargets: InteractiveHitTargets = {
    connectedConnector: createConnectorHitTarget(
      root,
      connectedMovableConnector,
      PISTON_MODEL_HIT_TARGETS.connectedHoseConnector.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    connectedHandle: createHoseHandleHitTarget(
      root,
      connectedHose,
      connectedMovableConnector,
      PISTON_MODEL_HIT_TARGETS.connectedHoseHandle.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    connectedBody: createBodyHitTarget(
      root,
      connectedHose,
      PISTON_MODEL_HIT_TARGETS.connectedHoseBody.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    detachedConnector: createConnectorHitTarget(
      root,
      detachedConnector,
      PISTON_MODEL_HIT_TARGETS.detachedHoseConnector.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    detachedHandle: createHoseHandleHitTarget(
      root,
      detachedHose,
      detachedConnector,
      PISTON_MODEL_HIT_TARGETS.detachedHoseHandle.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    detachedBody: createBodyHitTarget(
      root,
      detachedHose,
      PISTON_MODEL_HIT_TARGETS.detachedHoseBody.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    pistonPlatform: createBoxHitTarget(
      root,
      massPlatform,
      'HIT_PistonPlatform_FocusEntry',
      hitMaterial,
      ownedGeometries,
    ),
    pistonCylinder: createBoxHitTarget(
      root,
      glassCylinder,
      PISTON_MODEL_HIT_TARGETS.pistonCylinderFocusEntry.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    pistonFrame: createBoxHitTarget(
      root,
      protectiveFrame,
      PISTON_MODEL_HIT_TARGETS.pistonFrameFocusEntry.objectName,
      hitMaterial,
      ownedGeometries,
    ),
    pistonLockingScrew: createBoxHitTarget(
      root,
      lockingScrewMovingPart,
      PISTON_MODEL_HIT_TARGETS.pistonLockingScrewFocusEntry.objectName,
      hitMaterial,
      ownedGeometries,
    ),
  };

  const snapRingGeometry = new THREE.TorusGeometry(
    PISTON_OSCILLATION_HOSE_MAGNETIC_SNAP_RADIUS_M,
    0.00065,
    8,
    72,
  );
  ownedGeometries.add(snapRingGeometry);
  const snapRing = new THREE.Mesh(snapRingGeometry, snapRingMaterial);
  snapRing.name = 'GUIDE_Hose_Main_MagneticSnapBoundary';
  snapRing.position.copy(root.worldToLocal(connectedConnectorWorldPosition.clone()));
  snapRing.rotation.x = Math.PI / 2;
  snapRing.visible = false;
  snapRing.raycast = () => undefined;
  snapRing.renderOrder = 19;
  root.add(snapRing);
  root.updateWorldMatrix(true, true);

  const focusShells = {
    platform: createFocusShellInstance(
      root,
      'platform',
      [massPlatform],
      massPlatform,
      focusShellBreathMaterial,
      focusShellPulseMaterial,
    ),
    screw: createFocusShellInstance(
      root,
      'screw',
      [lockingScrewMovingPart],
      lockingScrewMovingPart,
      focusShellBreathMaterial,
      focusShellPulseMaterial,
    ),
    connectedHoseHandle: createFocusShellInstance(
      root,
      'connectedHoseHandle',
      [connectedHose, quickDisconnect],
      connectedMovableConnector,
      focusShellBreathMaterial,
      focusShellPulseMaterial,
    ),
    detachedHoseHandle: createFocusShellInstance(
      root,
      'detachedHoseHandle',
      [detachedHose, detachedConnector],
      detachedConnector,
      focusShellBreathMaterial,
      focusShellPulseMaterial,
    ),
  };
  root.updateWorldMatrix(true, true);

  return {
    root,
    bounds,
    ownedMaterials,
    ownedGeometries,
    pistonAssembly,
    massPlatform,
    pistonAssemblyWorldYAtScaleCalibration:
      pistonAssembly.getWorldPosition(new THREE.Vector3()).y,
    lockingScrewMovingPart,
    connectedHose,
    quickDisconnect,
    connectedMovableConnector,
    connectedInternalConnector,
    detachedHoseAssembly,
    detachedHose,
    detachedConnector,
    ghostAssembly,
    connectedGhostAssembly,
    detachedGhostAssembly,
    hitTargets,
    snapRing,
    connectedConnectorWorldPosition,
    detachedConnectorWorldPosition,
    detachedToConnectedLocalOffset,
    focusShellBreathMaterial,
    focusShellPulseMaterial,
    focusShells,
  };
};

const moveObjectWorldY = (
  root: THREE.Object3D,
  object: THREE.Object3D,
  targetWorldY: number,
) => {
  root.updateWorldMatrix(true, true);
  const worldPosition = object.getWorldPosition(new THREE.Vector3());
  const parent = object.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  const targetLocalPosition = parent.worldToLocal(
    worldPosition.clone().setY(targetWorldY),
  );
  object.position.copy(targetLocalPosition);
  object.updateWorldMatrix(true, true);
};

const isObjectOrDescendantOf = (
  object: THREE.Object3D,
  ancestor: THREE.Object3D,
) => {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
};

export interface PistonOscillationInteractiveModelProps {
  sourceScene: THREE.Object3D;
  pistonEquilibriumHeightMm: number;
  pistonOscillationOffsetMm: number;
  lockingScrewProgress: number;
  hoseState: PistonOscillationHoseState;
  hoseInteractionEnabled: boolean;
  hoseDragging: boolean;
  hoseWithinMagneticRange: boolean;
  hoseGhostOffset: readonly [number, number, number];
  demoFocusTarget?: PistonOscillationDemoFocusTarget;
  demoFocusTheme?: PistonOscillationDemoGuideTheme;
  demoFocusPulseElapsedSeconds?: number;
  demoHoseDragProgress?: number | null;
  demoSnapGuideActive?: boolean;
  demoSnapGuidePulseElapsedSeconds?: number;
  scaleReadingVisualEnhancement?: boolean;
  interactionEnabled?: boolean;
  onBoundsReady: (bounds: PistonOscillationInteractiveBounds) => void;
  onHoseFocusPointReady?: (point: THREE.Vector3 | null) => void;
  onPistonFocusRequest: () => void;
  onHoseHoverChange?: (hovered: boolean) => void;
  onHoseDragStart: () => boolean | void;
  onHoseDragChange: (offset: THREE.Vector3, withinMagneticRange: boolean) => void;
  onHoseDragEnd: (offset: THREE.Vector3, withinMagneticRange: boolean) => void;
}

export const PistonOscillationInteractiveModel = ({
  sourceScene,
  pistonEquilibriumHeightMm,
  pistonOscillationOffsetMm,
  lockingScrewProgress,
  hoseState,
  hoseInteractionEnabled,
  hoseDragging,
  hoseWithinMagneticRange,
  hoseGhostOffset,
  demoFocusTarget = null,
  demoFocusTheme = 'light',
  demoFocusPulseElapsedSeconds,
  demoHoseDragProgress = null,
  demoSnapGuideActive = false,
  demoSnapGuidePulseElapsedSeconds,
  scaleReadingVisualEnhancement = false,
  interactionEnabled = true,
  onBoundsReady,
  onHoseFocusPointReady = () => undefined,
  onPistonFocusRequest,
  onHoseHoverChange = () => undefined,
  onHoseDragStart,
  onHoseDragChange,
  onHoseDragEnd,
}: PistonOscillationInteractiveModelProps) => {
  const dragActiveRef = useRef(false);
  const dragSourceStateRef = useRef<PistonOscillationHoseState>('connected');
  const dragStartPointRef = useRef(new THREE.Vector3());
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragRaycasterRef = useRef(new THREE.Raycaster());
  const dragPointerRef = useRef(new THREE.Vector2());
  const activeGestureCancelRef = useRef<(() => void) | null>(null);
  const demoFocusStartedAtRef = useRef<number | null>(null);
  const demoSnapGuideStartedAtRef = useRef<number | null>(null);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const model = useMemo(
    () => createInteractiveModelInstance(sourceScene, scaleReadingVisualEnhancement),
    [scaleReadingVisualEnhancement, sourceScene],
  );

  useLayoutEffect(() => {
    onBoundsReady(model.bounds);
  }, [model.bounds, onBoundsReady]);

  useLayoutEffect(() => {
    onHoseFocusPointReady(model.connectedConnectorWorldPosition.clone());
  }, [model.connectedConnectorWorldPosition, onHoseFocusPointReady]);

  useLayoutEffect(() => {
    const targetWorldY = getPistonAssemblyTargetWorldY(
      model.pistonAssemblyWorldYAtScaleCalibration,
      {
        equilibriumHeightMm: pistonEquilibriumHeightMm,
        oscillationOffsetMm: pistonOscillationOffsetMm,
      },
    );
    moveObjectWorldY(model.root, model.pistonAssembly, targetWorldY);
    syncBoxHitTarget(
      model.root,
      model.massPlatform,
      model.hitTargets.pistonPlatform,
    );
    model.pistonAssembly.userData = {
      ...model.pistonAssembly.userData,
      runtimeMotionAxis: PISTON_MODEL_VERTICAL_AXIS,
      scaleCalibrationHeightMm: PISTON_SCALE_CALIBRATION_HEIGHT_MM,
      equilibriumHeightMm: pistonEquilibriumHeightMm,
      oscillationOffsetMm: pistonOscillationOffsetMm,
    };
  }, [model, pistonEquilibriumHeightMm, pistonOscillationOffsetMm]);

  useLayoutEffect(() => {
    model.lockingScrewMovingPart.position.x =
      -PISTON_OSCILLATION_LOCKING_SCREW_TRAVEL_M * lockingScrewProgress;
    model.lockingScrewMovingPart.rotation.x =
      -Math.PI * 2 * PISTON_OSCILLATION_LOCKING_SCREW_TURNS * lockingScrewProgress;
    model.lockingScrewMovingPart.updateWorldMatrix(true, true);
    syncBoxHitTarget(
      model.root,
      model.lockingScrewMovingPart,
      model.hitTargets.pistonLockingScrew,
    );
  }, [lockingScrewProgress, model]);

  useLayoutEffect(() => {
    const connected = hoseState === 'connected';
    const normalizedDemoDragProgress = demoHoseDragProgress === null
      ? null
      : THREE.MathUtils.clamp(demoHoseDragProgress, 0, 1);
    const demoGhostOffset = normalizedDemoDragProgress === null
      ? null
      : model.detachedToConnectedLocalOffset.clone().multiplyScalar(normalizedDemoDragProgress);
    const effectiveHoseDragging = hoseDragging || normalizedDemoDragProgress !== null;
    const demoWithinMagneticRange = normalizedDemoDragProgress !== null
      && model.detachedToConnectedLocalOffset.length() * (1 - normalizedDemoDragProgress)
        <= PISTON_OSCILLATION_HOSE_MAGNETIC_SNAP_RADIUS_M;
    const effectiveWithinMagneticRange = normalizedDemoDragProgress === null
      ? hoseWithinMagneticRange
      : demoWithinMagneticRange;
    model.connectedHose.visible = connected;
    model.quickDisconnect.visible = true;
    model.connectedMovableConnector.visible = connected;
    model.connectedInternalConnector.visible = connected;
    model.detachedHoseAssembly.visible = !connected;
    model.hitTargets.connectedConnector.visible = connected;
    model.hitTargets.connectedHandle.visible = connected;
    model.hitTargets.connectedBody.visible = connected;
    model.hitTargets.detachedConnector.visible = !connected;
    model.hitTargets.detachedHandle.visible = !connected;
    model.hitTargets.detachedBody.visible = !connected;
    model.ghostAssembly.visible = effectiveHoseDragging;
    model.connectedGhostAssembly.visible = connected;
    model.detachedGhostAssembly.visible = !connected;
    model.ghostAssembly.position.copy(demoGhostOffset ?? new THREE.Vector3(...hoseGhostOffset));
    model.snapRing.visible = effectiveHoseDragging || demoSnapGuideActive;
    (model.snapRing.material as THREE.MeshBasicMaterial).color.set(
      effectiveWithinMagneticRange ? '#3f9dcc' : '#cf704f',
    );
    model.root.updateWorldMatrix(true, true);
  }, [
    demoHoseDragProgress,
    demoSnapGuideActive,
    hoseDragging,
    hoseGhostOffset,
    hoseState,
    hoseWithinMagneticRange,
    model,
  ]);

  useLayoutEffect(() => {
    const palette = PISTON_FOCUS_SHELL_PALETTES[demoFocusTheme];
    model.focusShellBreathMaterial.color.set(palette.color);
    model.focusShellBreathMaterial.blending = palette.blending;
    model.focusShellBreathMaterial.needsUpdate = true;
    model.focusShellPulseMaterial.color.set(palette.rimColor);
    model.focusShellPulseMaterial.blending = palette.blending;
    model.focusShellPulseMaterial.needsUpdate = true;
  }, [demoFocusTheme, model]);

  useLayoutEffect(() => {
    model.focusShells.platform.anchorGroup.visible = demoFocusTarget === 'platform';
    model.focusShells.screw.anchorGroup.visible = demoFocusTarget === 'screw';
    model.focusShells.connectedHoseHandle.anchorGroup.visible =
      demoFocusTarget === 'hose' && hoseState === 'connected';
    model.focusShells.detachedHoseHandle.anchorGroup.visible =
      demoFocusTarget === 'hose' && hoseState === 'disconnected';
  }, [demoFocusTarget, hoseState, model]);

  useEffect(() => {
    demoFocusStartedAtRef.current = null;
  }, [demoFocusTarget]);

  useEffect(() => {
    demoSnapGuideStartedAtRef.current = null;
  }, [demoSnapGuideActive]);

  useFrame(({ clock }) => {
    const palette = PISTON_FOCUS_SHELL_PALETTES[demoFocusTheme];
    const activeShell = demoFocusTarget === 'platform'
      ? model.focusShells.platform
      : demoFocusTarget === 'screw'
        ? model.focusShells.screw
        : demoFocusTarget === 'hose'
          ? hoseState === 'connected'
            ? model.focusShells.connectedHoseHandle
            : model.focusShells.detachedHoseHandle
          : null;

    if (activeShell) {
      syncFocusShellAnchor(model.root, activeShell);
      if (demoFocusStartedAtRef.current === null) {
        demoFocusStartedAtRef.current = clock.elapsedTime;
      }
      const elapsed = demoFocusPulseElapsedSeconds === undefined
        ? Math.max(0, clock.elapsedTime - demoFocusStartedAtRef.current)
        : Math.max(0, demoFocusPulseElapsedSeconds);
      const breath = getPistonGuideCuePulse(elapsed, 0.46);
      const outwardPulse = getPistonGuideCuePulse(elapsed, palette.pulseRate);
      activeShell.breathGroup.scale.setScalar(
        palette.baseScale + breath * palette.breathScale,
      );
      activeShell.pulseGroup.scale.setScalar(THREE.MathUtils.lerp(
        palette.pulseStartScale,
        PISTON_FOCUS_SHELL_PULSE_PEAK_SCALE[demoFocusTarget!],
        outwardPulse,
      ));
      model.focusShellBreathMaterial.opacity = palette.breathMinOpacity
        + breath * (palette.breathMaxOpacity - palette.breathMinOpacity);
      model.focusShellPulseMaterial.opacity = palette.pulseOpacity * outwardPulse;
    } else {
      model.focusShellBreathMaterial.opacity = 0;
      model.focusShellPulseMaterial.opacity = 0;
    }

    const snapRingMaterial = model.snapRing.material as THREE.MeshBasicMaterial;
    if (demoSnapGuideActive) {
      if (demoSnapGuideStartedAtRef.current === null) {
        demoSnapGuideStartedAtRef.current = clock.elapsedTime;
      }
      const elapsed = demoSnapGuidePulseElapsedSeconds === undefined
        ? Math.max(0, clock.elapsedTime - demoSnapGuideStartedAtRef.current)
        : Math.max(0, demoSnapGuidePulseElapsedSeconds);
      const pulse = getPistonGuideCuePulse(elapsed, palette.pulseRate);
      model.snapRing.scale.setScalar(
        palette.guideBaseScale + pulse * palette.guidePulseScale,
      );
      snapRingMaterial.opacity = palette.guideMinOpacity
        + pulse * (palette.guideMaxOpacity - palette.guideMinOpacity);
      if (!hoseDragging && demoHoseDragProgress === null) {
        snapRingMaterial.color.set(palette.color);
      }
    } else {
      model.snapRing.scale.setScalar(1);
      snapRingMaterial.opacity = 0.64;
    }

    if (activeShell || demoSnapGuideActive) invalidate();
  });

  const getWithinMagneticRange = useCallback((offset: THREE.Vector3) => {
    const sourcePosition = dragSourceStateRef.current === 'connected'
      ? model.connectedConnectorWorldPosition
      : model.detachedConnectorWorldPosition;
    const targetPosition = model.connectedConnectorWorldPosition;
    const targetNdc = targetPosition.clone().project(camera);
    const cameraRight = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(PISTON_OSCILLATION_HOSE_MAGNETIC_SNAP_RADIUS_M);
    const snapEdgeNdc = targetPosition.clone().add(cameraRight).project(camera);
    const ghostConnectorNdc = sourcePosition.clone().add(offset).project(camera);
    return ghostConnectorNdc.distanceTo(targetNdc)
      <= targetNdc.distanceTo(snapEdgeNdc);
  }, [camera, model]);

  const getDragOffsetAtClientPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = gl.domElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    dragPointerRef.current.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    dragRaycasterRef.current.setFromCamera(dragPointerRef.current, camera);
    const point = dragRaycasterRef.current.ray.intersectPlane(
      dragPlaneRef.current,
      new THREE.Vector3(),
    );
    return point ? point.sub(dragStartPointRef.current).setY(0) : null;
  }, [camera, gl.domElement]);

  const isHoseHitTarget = useCallback((object: THREE.Object3D) => (
    object === model.hitTargets.connectedConnector
    || object === model.hitTargets.connectedHandle
    || object === model.hitTargets.connectedBody
    || object === model.hitTargets.detachedConnector
    || object === model.hitTargets.detachedHandle
    || object === model.hitTargets.detachedBody
    || isObjectOrDescendantOf(object, model.connectedHose)
    || isObjectOrDescendantOf(object, model.connectedMovableConnector)
    || isObjectOrDescendantOf(object, model.detachedHose)
    || isObjectOrDescendantOf(object, model.detachedConnector)
  ), [model]);

  const isPistonFocusHitTarget = useCallback((object: THREE.Object3D) => (
    object === model.hitTargets.pistonPlatform
    || object === model.hitTargets.pistonCylinder
    || object === model.hitTargets.pistonFrame
    || object === model.hitTargets.pistonLockingScrew
  ), [model]);

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (
      !interactionEnabled
      || !hoseInteractionEnabled
      || event.button !== 0
      || !event.intersections.some(({ object }) => isHoseHitTarget(object))
    ) return;
    const connectorPosition = hoseState === 'connected'
      ? model.connectedConnectorWorldPosition
      : model.detachedConnectorWorldPosition;
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (onHoseDragStart() === false) {
      gl.domElement.style.cursor = '';
      return;
    }
    dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -connectorPosition.y);
    const startPoint = event.ray.intersectPlane(dragPlaneRef.current, new THREE.Vector3());
    if (!startPoint) return;
    dragStartPointRef.current.copy(startPoint);
    dragActiveRef.current = true;
    dragSourceStateRef.current = hoseState;
    gl.domElement.style.cursor = 'grabbing';
    try {
      gl.domElement.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic browser-test events may not have an active capture target.
    }

    let finished = false;
    const cleanup = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerCancel);
      window.removeEventListener('lostpointercapture', handleWindowPointerCancel);
      if (activeGestureCancelRef.current === cancelGesture) {
        activeGestureCancelRef.current = null;
      }
    };
    const finishGesture = (
      finishEvent: PointerEvent | null,
      cancelled: boolean,
    ) => {
      if (finished) return;
      if (finishEvent && finishEvent.pointerId !== event.pointerId) return;
      finished = true;
      const offset = finishEvent
        ? getDragOffsetAtClientPoint(finishEvent.clientX, finishEvent.clientY)
          ?? new THREE.Vector3()
        : new THREE.Vector3();
      const withinMagneticRange = cancelled
        ? dragSourceStateRef.current === 'connected'
        : getWithinMagneticRange(offset);
      dragActiveRef.current = false;
      cleanup();
      try {
        if (gl.domElement.hasPointerCapture?.(event.pointerId)) {
          gl.domElement.releasePointerCapture?.(event.pointerId);
        }
      } catch {
        // Matching guard for synthetic pointer events.
      }
      gl.domElement.style.cursor = '';
      onHoseDragEnd(offset, withinMagneticRange);
    };
    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      if (!dragActiveRef.current || moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      const offset = getDragOffsetAtClientPoint(moveEvent.clientX, moveEvent.clientY);
      if (!offset) return;
      onHoseDragChange(offset, getWithinMagneticRange(offset));
    };
    const handleWindowPointerUp = (upEvent: PointerEvent) => finishGesture(upEvent, false);
    const handleWindowPointerCancel = (cancelEvent: PointerEvent) => finishGesture(cancelEvent, true);
    const cancelGesture = () => finishGesture(null, true);
    activeGestureCancelRef.current?.();
    activeGestureCancelRef.current = cancelGesture;
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);
    window.addEventListener('lostpointercapture', handleWindowPointerCancel);
  }, [
    getDragOffsetAtClientPoint,
    getWithinMagneticRange,
    gl.domElement,
    hoseInteractionEnabled,
    hoseState,
    interactionEnabled,
    isHoseHitTarget,
    model,
    onHoseDragChange,
    onHoseDragEnd,
    onHoseDragStart,
  ]);

  useEffect(() => {
    if (!hoseInteractionEnabled || !interactionEnabled) activeGestureCancelRef.current?.();
  }, [hoseInteractionEnabled, interactionEnabled]);

  useEffect(() => () => {
    activeGestureCancelRef.current?.();
    gl.domElement.style.cursor = '';
    model.ownedGeometries.forEach((geometry) => geometry.dispose());
    model.ownedMaterials.forEach((material) => material.dispose());
    model.ownedGeometries.clear();
    model.ownedMaterials.clear();
  }, [gl.domElement.style, model]);

  return (
    <primitive
      object={model.root}
      dispose={null}
      onDoubleClick={(event: ThreeEvent<MouseEvent>) => {
        if (!interactionEnabled) return;
        if (isPistonFocusHitTarget(event.object)) {
          event.stopPropagation();
          onPistonFocusRequest();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (
          !interactionEnabled
          || !hoseInteractionEnabled
          || !isHoseHitTarget(event.object)
        ) return;
        event.stopPropagation();
        gl.domElement.style.cursor = dragActiveRef.current ? 'grabbing' : 'grab';
        onHoseHoverChange(true);
      }}
      onPointerOut={(event: ThreeEvent<PointerEvent>) => {
        if (
          !interactionEnabled
          || !hoseInteractionEnabled
          || !isHoseHitTarget(event.object)
          || dragActiveRef.current
        ) return;
        event.stopPropagation();
        gl.domElement.style.cursor = '';
        onHoseHoverChange(false);
      }}
    />
  );
};

export default PistonOscillationInteractiveModel;
