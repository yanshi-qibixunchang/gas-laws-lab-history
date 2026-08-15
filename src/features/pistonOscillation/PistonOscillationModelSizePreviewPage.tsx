import {
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
import {
  PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM,
  PistonOscillationInstrumentAsset,
} from './PistonOscillationInstrumentModel.tsx';
import { PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES } from './pistonOscillationCameraViews.ts';
import './PistonOscillationModelSizePreviewPage.css';

const OFFICIAL_PISTON_DIAMETER_M = 0.0325;
const SOURCE_PISTON_DIAMETER_M = 0.04444;
const INSTRUMENT_BODY_CORRECTION_FACTOR =
  OFFICIAL_PISTON_DIAMETER_M / SOURCE_PISTON_DIAMETER_M;
const HOSE_RADIUS_M = 0.0025;
const SOURCE_TABLETOP_NODE_NAME = 'Tabletop';
const INSTRUMENT_BODY_ROOT_NODE_NAME = 'InstrumentBodyScaled_ROOT';
const INTERNAL_HOSE_NODE_NAME = 'Hose_Internal_ToCylinder';
const EXTERNAL_HOSE_NODE_NAME = 'Hose_Main_Default';
const SCALE_TICKS_NODE_NAME = 'ScaleTicks_Unnumbered';
const SCALE_LABEL_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;
const SCALE_MAX_TICK_MM = 85;
const SCALE_PREVIEW_PISTON_HEIGHT_MM = 85;
const PISTON_TOP_CLEARANCE_M = 0.0007;
const UPPER_UNMARKED_EXTENSION_M = 0.01;
const LOCKING_SCREW_KNOB_RADIUS_M = 0.0065;
const LOCKING_SCREW_KNOB_DEPTH_M = 0.006;
const LOCKING_SCREW_SEAT_RADIUS_M = 0.005;
const LOCKING_SCREW_SEAT_DEPTH_M = 0.004;
const LOCKING_SCREW_SHAFT_RADIUS_M = 0.0016;
const LOCKING_SCREW_CONTACT_GAP_M = 0.001;
const PROTECTIVE_FRAME_PANEL_NODE_NAMES = [
  'ProtectiveFrame_BackPanel',
  'ProtectiveFrame_FrontPanel',
  'ProtectiveFrame_LeftPanel',
  'ProtectiveFrame_RightPanel',
] as const;
const BODY_HEIGHT_FOLLOWER_NODE_NAMES = [
  'RodClampBridge',
  'RodClampKnob',
  'RodClampMount',
  'AXIS_RodClamp',
] as const;

type PreviewMode = 'lockingScrew' | 'scale' | 'corrected' | 'source';

interface PreviewBounds {
  center: THREE.Vector3;
  span: number;
}

interface OwnedPreviewModel {
  root: THREE.Object3D;
  bounds: PreviewBounds;
  ownedMaterials: Set<THREE.Material>;
  ownedGeometries: Set<THREE.BufferGeometry>;
}

const getWorldPosition = (root: THREE.Object3D, nodeName: string) => {
  const node = root.getObjectByName(nodeName);
  if (!node) {
    throw new Error(`Piston-oscillation GLB is missing preview node: ${nodeName}`);
  }
  return node.getWorldPosition(new THREE.Vector3());
};

const transformPointAroundPivot = (
  point: THREE.Vector3,
  pivot: THREE.Vector3,
  scale: number,
) => pivot.clone().add(point.clone().sub(pivot).multiplyScalar(scale));

const getRequiredObject = (root: THREE.Object3D, nodeName: string) => {
  const node = root.getObjectByName(nodeName);
  if (!node) {
    throw new Error(`Piston-oscillation GLB is missing preview node: ${nodeName}`);
  }
  return node;
};

const moveObjectWorldY = (
  root: THREE.Object3D,
  object: THREE.Object3D,
  targetWorldY: number,
) => {
  const parent = object.parent;
  if (!parent) {
    throw new Error(`Piston-oscillation preview node has no parent: ${object.name}`);
  }

  root.updateWorldMatrix(true, true);
  const targetWorldPosition = object.getWorldPosition(new THREE.Vector3());
  targetWorldPosition.y = targetWorldY;
  object.position.copy(parent.worldToLocal(targetWorldPosition));
  root.updateWorldMatrix(true, true);
};

const resizeObjectWorldY = (
  root: THREE.Object3D,
  object: THREE.Object3D,
  targetMinY: number,
  targetMaxY: number,
) => {
  root.updateWorldMatrix(true, true);
  const currentBounds = new THREE.Box3().setFromObject(object);
  const currentHeight = currentBounds.max.y - currentBounds.min.y;
  const targetHeight = targetMaxY - targetMinY;
  if (currentBounds.isEmpty() || currentHeight <= 0 || targetHeight <= 0) {
    throw new Error(`Piston-oscillation preview cannot resize node: ${object.name}`);
  }

  object.scale.y *= targetHeight / currentHeight;
  root.updateWorldMatrix(true, true);
  const resizedBounds = new THREE.Box3().setFromObject(object);
  const targetCenterY = (targetMinY + targetMaxY) / 2;
  const resizedCenterY = (resizedBounds.min.y + resizedBounds.max.y) / 2;
  const objectWorldY = object.getWorldPosition(new THREE.Vector3()).y;
  moveObjectWorldY(root, object, objectWorldY + targetCenterY - resizedCenterY);
};

const followCorrectedBodyHeight = (
  root: THREE.Object3D,
  nodeName: string,
  bodyPivot: THREE.Vector3,
) => {
  const node = root.getObjectByName(nodeName);
  const parent = node?.parent;
  if (!node || !parent) {
    throw new Error(`Piston-oscillation GLB is missing height follower: ${nodeName}`);
  }

  const correctedWorldPosition = node.getWorldPosition(new THREE.Vector3());
  correctedWorldPosition.y = bodyPivot.y
    + (correctedWorldPosition.y - bodyPivot.y) * INSTRUMENT_BODY_CORRECTION_FACTOR;
  node.position.copy(parent.worldToLocal(correctedWorldPosition));
};

const createCorrectedExternalHose = (
  root: THREE.Object3D,
  bodyPivot: THREE.Vector3,
) => {
  const start = transformPointAroundPivot(
    getWorldPosition(root, 'ANCHOR_Hose_Start'),
    bodyPivot,
    INSTRUMENT_BODY_CORRECTION_FACTOR,
  );
  const firstControl = transformPointAroundPivot(
    getWorldPosition(root, 'ANCHOR_Hose_Control_1'),
    bodyPivot,
    INSTRUMENT_BODY_CORRECTION_FACTOR,
  );
  const secondControl = getWorldPosition(root, 'ANCHOR_Hose_Control_2');
  const end = getWorldPosition(root, 'ANCHOR_Hose_End');
  const connectorAxisLead = start.clone().add(new THREE.Vector3(0, 0.009, 0));
  const connectorBendLead = start.clone().lerp(firstControl, 0.12);
  connectorBendLead.y = start.y + 0.017;
  const curve = new THREE.CatmullRomCurve3(
    [start, connectorAxisLead, connectorBendLead, firstControl, secondControl, end],
    false,
    'centripetal',
  );
  const geometry = new THREE.TubeGeometry(curve, 160, HOSE_RADIUS_M, 14, false);
  const material = new THREE.MeshStandardMaterial({
    color: '#20262b',
    roughness: 0.82,
    metalness: 0.03,
  });
  const hose = new THREE.Mesh(geometry, material);
  hose.name = 'Hose_Main_SizeCorrectedPreview';
  hose.castShadow = false;
  hose.receiveShadow = false;
  return { hose, geometry, material };
};

const getTickBandCenters = (geometry: THREE.BufferGeometry) => {
  const positions = geometry.getAttribute('position');
  if (!positions) {
    throw new Error('Piston-oscillation scale ticks have no position attribute.');
  }

  const yLevels = Array.from(
    new Set(Array.from({ length: positions.count }, (_, index) => positions.getY(index).toFixed(7))),
  ).map(Number).sort((left, right) => left - right);
  if (yLevels.length < 6 || yLevels.length % 2 !== 0) {
    throw new Error('Piston-oscillation scale ticks have an unexpected band layout.');
  }

  const centers: number[] = [];
  for (let index = 0; index < yLevels.length; index += 2) {
    centers.push((yLevels[index] + yLevels[index + 1]) / 2);
  }
  return centers;
};

const extractTickTemplateGeometry = (
  source: THREE.BufferGeometry,
  centerY: number,
) => {
  const index = source.index;
  const positions = source.getAttribute('position');
  const normals = source.getAttribute('normal');
  if (!index || !positions || !normals) {
    throw new Error('Piston-oscillation scale ticks are missing indexed geometry data.');
  }

  const templatePositions: number[] = [];
  const templateNormals: number[] = [];
  for (let offset = 0; offset < index.count; offset += 3) {
    const indices = [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)];
    const triangleCenterY = indices.reduce(
      (sum, vertexIndex) => sum + positions.getY(vertexIndex),
      0,
    ) / 3;
    if (Math.abs(triangleCenterY - centerY) > 0.001) continue;

    indices.forEach((vertexIndex) => {
      templatePositions.push(
        positions.getX(vertexIndex),
        positions.getY(vertexIndex) - centerY,
        positions.getZ(vertexIndex),
      );
      templateNormals.push(
        normals.getX(vertexIndex),
        normals.getY(vertexIndex),
        normals.getZ(vertexIndex),
      );
    });
  }

  if (templatePositions.length === 0) {
    throw new Error('Piston-oscillation scale tick template extraction failed.');
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(templatePositions, 3),
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(templateNormals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const createScaleTickInstances = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  values: number[],
  scaleZeroLocalY: number,
  localMetersPerMillimeter: number,
  name: string,
) => {
  const ticks = new THREE.InstancedMesh(geometry, material, values.length);
  const matrix = new THREE.Matrix4();
  values.forEach((value, index) => {
    matrix.makeTranslation(0, scaleZeroLocalY + value * localMetersPerMillimeter, 0);
    ticks.setMatrixAt(index, matrix);
  });
  ticks.instanceMatrix.needsUpdate = true;
  ticks.name = name;
  ticks.castShadow = false;
  ticks.receiveShadow = false;
  ticks.frustumCulled = false;
  ticks.raycast = () => undefined;
  return ticks;
};

const applyScaleCalibration = (
  root: THREE.Object3D,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  root.updateWorldMatrix(true, true);
  const sourceTicks = getRequiredObject(root, SCALE_TICKS_NODE_NAME) as THREE.Mesh;
  if (!sourceTicks.isMesh || !(sourceTicks.geometry instanceof THREE.BufferGeometry)) {
    throw new Error('Piston-oscillation scale tick node is not a mesh.');
  }
  const sourceTickParent = sourceTicks.parent;
  const tickMaterial = Array.isArray(sourceTicks.material)
    ? sourceTicks.material[0]
    : sourceTicks.material;
  if (!sourceTickParent || !tickMaterial) {
    throw new Error('Piston-oscillation scale ticks are missing a parent or material.');
  }

  const tickBandCenters = getTickBandCenters(sourceTicks.geometry);
  const scaleZeroLocalY = tickBandCenters[0];
  const tickWorldScaleY = sourceTicks.getWorldScale(new THREE.Vector3()).y;
  const localMetersPerMillimeter = 0.001 / tickWorldScaleY;
  const majorGeometry = extractTickTemplateGeometry(sourceTicks.geometry, tickBandCenters[0]);
  const minorGeometry = extractTickTemplateGeometry(sourceTicks.geometry, tickBandCenters[1]);
  const middleGeometry = extractTickTemplateGeometry(sourceTicks.geometry, tickBandCenters[2]);
  ownedGeometries.add(majorGeometry);
  ownedGeometries.add(minorGeometry);
  ownedGeometries.add(middleGeometry);

  const majorValues: number[] = [];
  const middleValues: number[] = [];
  const minorValues: number[] = [];
  for (let value = 0; value <= SCALE_MAX_TICK_MM; value += 1) {
    if (value % 10 === 0) majorValues.push(value);
    else if (value % 5 === 0) middleValues.push(value);
    else minorValues.push(value);
  }

  const calibratedTicks = new THREE.Group();
  calibratedTicks.name = 'ScaleTicks_0_to_85mm_Preview';
  calibratedTicks.position.copy(sourceTicks.position);
  calibratedTicks.quaternion.copy(sourceTicks.quaternion);
  calibratedTicks.scale.copy(sourceTicks.scale);
  calibratedTicks.add(
    createScaleTickInstances(
      majorGeometry,
      tickMaterial,
      majorValues,
      scaleZeroLocalY,
      localMetersPerMillimeter,
      'ScaleTicks_Major_10mm_Preview',
    ),
    createScaleTickInstances(
      middleGeometry,
      tickMaterial,
      middleValues,
      scaleZeroLocalY,
      localMetersPerMillimeter,
      'ScaleTicks_Middle_5mm_Preview',
    ),
    createScaleTickInstances(
      minorGeometry,
      tickMaterial,
      minorValues,
      scaleZeroLocalY,
      localMetersPerMillimeter,
      'ScaleTicks_Minor_1mm_Preview',
    ),
  );
  sourceTickParent.add(calibratedTicks);
  sourceTicks.visible = false;

  SCALE_LABEL_VALUES.forEach((value) => {
    const label = getRequiredObject(root, `ScaleLabel_${value}`);
    if (value > 80) {
      label.visible = false;
      return;
    }
    label.position.y = scaleZeroLocalY + value * localMetersPerMillimeter;
  });

  root.updateWorldMatrix(true, true);
  const scaleZeroWorldY = sourceTicks.localToWorld(
    new THREE.Vector3(0, scaleZeroLocalY, 0),
  ).y;
  const cylinder = getRequiredObject(root, 'Cylinder_Pyrex');
  const upperGuideRing = getRequiredObject(root, 'Cylinder_UpperGuideRing');
  const topSlab = getRequiredObject(root, 'ProtectiveFrame_TopSlab');
  const topBack = getRequiredObject(root, 'ProtectiveFrame_TopBack');
  const pistonAssembly = getRequiredObject(root, 'PistonAssembly_MOV');
  const piston = getRequiredObject(root, 'Piston_Graphite');
  const pistonBounds = new THREE.Box3().setFromObject(piston);
  const guideRingBounds = new THREE.Box3().setFromObject(upperGuideRing);
  const topSlabBounds = new THREE.Box3().setFromObject(topSlab);
  const cylinderBounds = new THREE.Box3().setFromObject(cylinder);
  const pistonHeight = pistonBounds.max.y - pistonBounds.min.y;
  const guideRingHeight = guideRingBounds.max.y - guideRingBounds.min.y;
  const topSlabHeight = topSlabBounds.max.y - topSlabBounds.min.y;
  const pistonTopAtScaleLimit = scaleZeroWorldY
    + SCALE_MAX_TICK_MM / 1000
    + pistonHeight;
  const targetGuideRingCenterY = pistonTopAtScaleLimit
    + PISTON_TOP_CLEARANCE_M
    + UPPER_UNMARKED_EXTENSION_M
    + guideRingHeight / 2;
  const targetCylinderTopY = targetGuideRingCenterY + guideRingHeight / 2;
  const targetTopSlabCenterY = targetCylinderTopY + topSlabHeight / 2;

  resizeObjectWorldY(root, cylinder, cylinderBounds.min.y, targetCylinderTopY);
  moveObjectWorldY(root, upperGuideRing, targetGuideRingCenterY);
  PROTECTIVE_FRAME_PANEL_NODE_NAMES.forEach((nodeName) => {
    const panel = getRequiredObject(root, nodeName);
    const panelBounds = new THREE.Box3().setFromObject(panel);
    resizeObjectWorldY(root, panel, panelBounds.min.y, targetCylinderTopY);
  });
  moveObjectWorldY(root, topSlab, targetTopSlabCenterY);
  moveObjectWorldY(root, topBack, targetTopSlabCenterY);
  BODY_HEIGHT_FOLLOWER_NODE_NAMES.forEach((nodeName) => {
    moveObjectWorldY(root, getRequiredObject(root, nodeName), targetTopSlabCenterY);
  });

  root.updateWorldMatrix(true, true);
  const updatedPistonBounds = new THREE.Box3().setFromObject(piston);
  const pistonTargetLowerEdgeY = scaleZeroWorldY
    + SCALE_PREVIEW_PISTON_HEIGHT_MM / 1000;
  const pistonAssemblyWorldY = pistonAssembly.getWorldPosition(new THREE.Vector3()).y;
  moveObjectWorldY(
    root,
    pistonAssembly,
    pistonAssemblyWorldY + pistonTargetLowerEdgeY - updatedPistonBounds.min.y,
  );
};

const getPreviewMaterial = (root: THREE.Object3D, nodeName: string) => {
  const mesh = getRequiredObject(root, nodeName) as THREE.Mesh;
  if (!mesh.isMesh || !mesh.material) {
    throw new Error(`Piston-oscillation preview node has no material: ${nodeName}`);
  }
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
};

const createPistonLockingScrewPreview = (
  root: THREE.Object3D,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  root.updateWorldMatrix(true, true);
  const topSlab = getRequiredObject(root, 'ProtectiveFrame_TopSlab');
  const pistonRod = getRequiredObject(root, 'PistonRod');
  const topSlabBounds = new THREE.Box3().setFromObject(topSlab);
  const pistonRodBounds = new THREE.Box3().setFromObject(pistonRod);
  const frameMaterial = getPreviewMaterial(root, 'ProtectiveFrame_TopSlab');
  const shaftMaterial = getPreviewMaterial(root, 'PistonRod');
  const assembly = new THREE.Group();
  const axisOrigin = new THREE.Vector3(
    topSlabBounds.max.x,
    (topSlabBounds.min.y + topSlabBounds.max.y) / 2,
    (pistonRodBounds.min.z + pistonRodBounds.max.z) / 2,
  );
  assembly.name = 'PistonLockingScrew_STATIC_Preview';
  assembly.position.copy(axisOrigin);
  assembly.userData = {
    component: 'piston_locking_screw',
    previewState: 'loose',
    axis: 'local_X',
    interactionDeferred: true,
  };

  const addAxialMesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    localX: number,
  ) => {
    ownedGeometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.x = localX;
    mesh.rotation.z = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => undefined;
    assembly.add(mesh);
    return mesh;
  };

  const contactTipEndLocalX = pistonRodBounds.max.x
    + LOCKING_SCREW_CONTACT_GAP_M
    - axisOrigin.x;
  const contactTipDepth = 0.002;
  const contactTipBaseLocalX = contactTipEndLocalX + contactTipDepth;
  const externalShaftEndLocalX = LOCKING_SCREW_SEAT_DEPTH_M + 0.003;
  const shaftDepth = externalShaftEndLocalX - contactTipBaseLocalX;
  addAxialMesh(
    new THREE.CylinderGeometry(
      LOCKING_SCREW_SHAFT_RADIUS_M,
      LOCKING_SCREW_SHAFT_RADIUS_M,
      shaftDepth,
      20,
    ),
    shaftMaterial,
    'PistonLockingScrew_ThreadedShaft_Preview',
    contactTipBaseLocalX + shaftDepth / 2,
  );
  addAxialMesh(
    new THREE.CylinderGeometry(
      LOCKING_SCREW_SEAT_RADIUS_M,
      LOCKING_SCREW_SEAT_RADIUS_M,
      LOCKING_SCREW_SEAT_DEPTH_M,
      24,
    ),
    frameMaterial,
    'PistonLockingScrew_ThreadedSeat_Preview',
    LOCKING_SCREW_SEAT_DEPTH_M / 2,
  );

  const knobCenterX = externalShaftEndLocalX + LOCKING_SCREW_KNOB_DEPTH_M / 2;
  addAxialMesh(
    new THREE.CylinderGeometry(
      LOCKING_SCREW_KNOB_RADIUS_M,
      LOCKING_SCREW_KNOB_RADIUS_M,
      LOCKING_SCREW_KNOB_DEPTH_M,
      20,
    ),
    frameMaterial,
    'PistonLockingScrew_KnurledKnob_Preview',
    knobCenterX,
  );

  [-0.002, 0, 0.002].forEach((offset, index) => {
    const grooveGeometry = new THREE.TorusGeometry(
      LOCKING_SCREW_KNOB_RADIUS_M * 0.96,
      0.00028,
      6,
      28,
    );
    ownedGeometries.add(grooveGeometry);
    const groove = new THREE.Mesh(grooveGeometry, frameMaterial);
    groove.name = `PistonLockingScrew_GripRing_${index + 1}_Preview`;
    groove.position.x = knobCenterX + offset;
    groove.rotation.y = Math.PI / 2;
    groove.castShadow = false;
    groove.receiveShadow = false;
    groove.raycast = () => undefined;
    assembly.add(groove);
  });

  addAxialMesh(
    new THREE.CylinderGeometry(
      LOCKING_SCREW_SHAFT_RADIUS_M,
      LOCKING_SCREW_SHAFT_RADIUS_M * 0.62,
      contactTipDepth,
      20,
    ),
    shaftMaterial,
    'PistonLockingScrew_ContactTip_Preview',
    contactTipEndLocalX + contactTipDepth / 2,
  );

  const interactionAxis = new THREE.Object3D();
  interactionAxis.name = 'AXIS_PistonLockingScrew';
  assembly.add(interactionAxis);
  root.add(assembly);
  root.updateWorldMatrix(true, true);
};

const measurePreviewModel = (root: THREE.Object3D): PreviewBounds => {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!object.visible || !mesh.isMesh || !mesh.geometry) return;
    if (object.name.startsWith('COL_')) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    meshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    bounds.union(meshBounds);
  });

  if (bounds.isEmpty()) {
    throw new Error('Piston-oscillation size preview has no visible model bounds.');
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  return { center, span: Math.max(size.x, size.y, size.z) };
};

const createPreviewBench = (sourceScene: THREE.Object3D) => {
  const bench = sourceScene.clone(true);
  bench.name = 'PistonModelSizePreview_UnifiedLightLabBench';
  bench.position.set(...PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM.position);
  bench.scale.set(...PISTON_OSCILLATION_UNIFIED_LIGHT_LAB_BENCH_TRANSFORM.scale);
  bench.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
  });
  return bench;
};

const createPreviewModel = (
  sourceScene: THREE.Object3D,
  unifiedLightLabBenchSourceScene: THREE.Object3D,
  mode: PreviewMode,
): OwnedPreviewModel => {
  const root = sourceScene.clone(true);
  const sourceTabletop = root.getObjectByName(SOURCE_TABLETOP_NODE_NAME);
  if (!sourceTabletop) {
    throw new Error(`Piston-oscillation GLB is missing node: ${SOURCE_TABLETOP_NODE_NAME}`);
  }
  sourceTabletop.visible = false;

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

  const ownedGeometries = new Set<THREE.BufferGeometry>();
  if (mode !== 'source') {
    root.updateWorldMatrix(true, true);
    const instrumentBody = root.getObjectByName(INSTRUMENT_BODY_ROOT_NODE_NAME);
    const internalHose = root.getObjectByName(INTERNAL_HOSE_NODE_NAME);
    const externalHose = root.getObjectByName(EXTERNAL_HOSE_NODE_NAME);
    if (!instrumentBody || !internalHose || !externalHose) {
      throw new Error('Piston-oscillation GLB is missing a size-correction dependency.');
    }

    const bodyPivot = instrumentBody.getWorldPosition(new THREE.Vector3());
    const correctedExternalHose = createCorrectedExternalHose(root, bodyPivot);
    BODY_HEIGHT_FOLLOWER_NODE_NAMES.forEach((nodeName) => {
      followCorrectedBodyHeight(root, nodeName, bodyPivot);
    });
    instrumentBody.attach(internalHose);
    instrumentBody.scale.multiplyScalar(INSTRUMENT_BODY_CORRECTION_FACTOR);
    externalHose.visible = false;
    ownedMaterials.add(correctedExternalHose.material);
    ownedGeometries.add(correctedExternalHose.geometry);
    root.add(correctedExternalHose.hose);
    if (mode === 'scale' || mode === 'lockingScrew') {
      root.updateWorldMatrix(true, true);
      applyScaleCalibration(root, ownedGeometries);
    }
    if (mode === 'lockingScrew') {
      createPistonLockingScrewPreview(root, ownedGeometries);
    }
  }

  root.updateWorldMatrix(true, true);
  const bounds = measurePreviewModel(root);
  root.add(createPreviewBench(unifiedLightLabBenchSourceScene));
  return { root, bounds, ownedMaterials, ownedGeometries };
};

const FullModelPreview = ({
  sourceScene,
  unifiedLightLabBenchSourceScene,
  mode,
  onBoundsReady,
}: {
  sourceScene: THREE.Object3D;
  unifiedLightLabBenchSourceScene: THREE.Object3D;
  mode: PreviewMode;
  onBoundsReady: (bounds: PreviewBounds) => void;
}) => {
  const ownedModel = useMemo(
    () => createPreviewModel(sourceScene, unifiedLightLabBenchSourceScene, mode),
    [mode, sourceScene, unifiedLightLabBenchSourceScene],
  );

  useLayoutEffect(() => {
    onBoundsReady(ownedModel.bounds);
  }, [onBoundsReady, ownedModel.bounds]);

  useEffect(() => () => {
    ownedModel.ownedGeometries.forEach((geometry) => geometry.dispose());
    ownedModel.ownedGeometries.clear();
    ownedModel.ownedMaterials.forEach((material) => material.dispose());
    ownedModel.ownedMaterials.clear();
  }, [ownedModel]);

  return <primitive object={ownedModel.root} dispose={null} />;
};

const PreviewCameraRig = ({
  bounds,
  controlsRef,
  resetRevision,
}: {
  bounds: PreviewBounds | null;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  resetRevision: number;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const appliedPoseKeyRef = useRef<string | null>(null);
  const overviewScheme = PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview;
  const previewDirection = new THREE.Vector3(...overviewScheme.direction).multiplyScalar(1.32);

  useLayoutEffect(() => {
    appliedPoseKeyRef.current = null;
    invalidate();
  }, [bounds, invalidate, resetRevision]);

  useFrame(() => {
    if (!bounds) return;
    const poseKey = `${resetRevision}:${size.width}:${size.height}:${bounds.span}`;
    if (appliedPoseKeyRef.current === poseKey) return;
    const controls = controlsRef.current;
    if (!(camera instanceof THREE.PerspectiveCamera) || !controls) return;

    const aspect = size.width / Math.max(1, size.height);
    const baseHalfFovRad = THREE.MathUtils.degToRad(overviewScheme.fov / 2);
    const responsiveFov = aspect < 1
      ? Math.min(
          62,
          THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseHalfFovRad) / aspect)),
        )
      : overviewScheme.fov;
    const target = bounds.center.clone().add(new THREE.Vector3(0, 0.025, 0));
    camera.position.copy(bounds.center).add(
      previewDirection.clone().multiplyScalar(bounds.span),
    );
    camera.fov = responsiveFov;
    camera.near = 0.002;
    camera.far = 20;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.update();
    appliedPoseKeyRef.current = poseKey;
    invalidate();
  });

  return null;
};

const formatMillimeters = (meters: number) => `${(meters * 1000).toFixed(2)} mm`;

export const PistonOscillationModelSizePreviewPage = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [mode, setMode] = useState<PreviewMode>('lockingScrew');
  const [bounds, setBounds] = useState<PreviewBounds | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const handleBoundsReady = useCallback((nextBounds: PreviewBounds) => {
    setBounds(nextBounds);
    setModelReady(true);
  }, []);
  const selectMode = useCallback((nextMode: PreviewMode) => {
    setModelReady(false);
    setBounds(null);
    setMode(nextMode);
    setResetRevision((value) => value + 1);
  }, []);
  const calibratedMode = mode === 'lockingScrew' || mode === 'scale';

  return (
    <main className="piston-model-size-preview-page">
      <section
        className="piston-model-size-preview-stage"
        aria-label="活塞振动法侧面锁紧螺钉静态模型临时预览"
        data-piston-model-size-preview-ready={modelReady ? 'true' : 'false'}
        data-piston-model-size-preview-mode={mode}
      >
        <Canvas
          camera={{ position: [0.2, 0.52, 0.9], fov: 38, near: 0.002, far: 20 }}
          dpr={[1, 1.5]}
          frameloop="always"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
          }}
        >
          <color attach="background" args={['#e8edf1']} />
          <hemisphereLight color="#ffffff" groundColor="#7b8791" intensity={2.2} />
          <directionalLight color="#fffdf7" intensity={2.2} position={[-1, -1.5, 2.2]} />
          <directionalLight color="#bfd6e6" intensity={1.2} position={[1.2, 1, 1.4]} />
          <Suspense fallback={null}>
            <PistonOscillationInstrumentAsset>
              {(sourceScene, unifiedLightLabBenchSourceScene) => (
                <FullModelPreview
                  sourceScene={sourceScene}
                  unifiedLightLabBenchSourceScene={unifiedLightLabBenchSourceScene}
                  mode={mode}
                  onBoundsReady={handleBoundsReady}
                />
              )}
            </PistonOscillationInstrumentAsset>
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan
            enableRotate
            enableZoom
            minDistance={0.16}
            maxDistance={4}
          />
          <PreviewCameraRig
            bounds={bounds}
            controlsRef={controlsRef}
            resetRevision={resetRevision}
          />
        </Canvas>

        {!modelReady ? (
          <div className="piston-model-size-preview-loading" role="status">
            正在加载整机尺寸预览…
          </div>
        ) : null}

        <header className="piston-model-size-preview-header">
          <div>
            <span>活塞振动法 · 整机模型第三阶段</span>
            <h1>侧面活塞锁紧螺钉静态模型</h1>
            <p>
              在已确认的刻度与上限结构上增加锁紧螺钉；本断点只审查安装位置、
              水平轴向、外形比例和整机可见性，不加入操作逻辑。
            </p>
          </div>
          <button type="button" onClick={() => setResetRevision((value) => value + 1)}>
            恢复确认视角
          </button>
        </header>

        <aside className="piston-model-size-preview-controls" aria-label="模型阶段切换">
          <strong>模型阶段</strong>
          <div role="group" aria-label="选择模型阶段">
            <button
              type="button"
              aria-pressed={mode === 'lockingScrew'}
              onClick={() => selectMode('lockingScrew')}
            >
              锁紧螺钉
            </button>
            <button
              type="button"
              aria-pressed={mode === 'scale'}
              onClick={() => selectMode('scale')}
            >
              刻度校准
            </button>
            <button
              type="button"
              aria-pressed={mode === 'corrected'}
              onClick={() => selectMode('corrected')}
            >
              尺寸阶段
            </button>
            <button
              type="button"
              aria-pressed={mode === 'source'}
              onClick={() => selectMode('source')}
            >
              原模型
            </button>
          </div>
          <dl>
            <div>
              <dt>活塞直径</dt>
              <dd>{mode === 'source'
                ? formatMillimeters(SOURCE_PISTON_DIAMETER_M)
                : formatMillimeters(OFFICIAL_PISTON_DIAMETER_M)}</dd>
            </div>
            <div>
              <dt>可见刻线</dt>
              <dd>{calibratedMode ? '0–85 mm' : '0–90 mm'}</dd>
            </div>
            <div>
              <dt>数字范围</dt>
              <dd>{calibratedMode ? '10–80' : '10–90'}</dd>
            </div>
            <div>
              <dt>活塞下沿</dt>
              <dd>{calibratedMode ? '85 mm' : '原始位置'}</dd>
            </div>
            <div>
              <dt>上方新增留白</dt>
              <dd>{calibratedMode ? '10 mm' : '—'}</dd>
            </div>
            <div>
              <dt>螺钉预览状态</dt>
              <dd>{mode === 'lockingScrew' ? '完全松开' : '未显示'}</dd>
            </div>
          </dl>
        </aside>

        <aside className="piston-model-size-preview-notes" aria-label="锁紧螺钉阶段调整范围">
          <strong>本阶段已加入</strong>
          <p>右侧水平锁紧螺钉、滚花手拧头、螺纹座、螺纹轴、内侧接触端和独立运动轴。</p>
          <strong>本断点暂不加入</strong>
          <p>旋转进退动效、旋紧状态、命中区域及活塞锁定判定。</p>
          <small>默认展示完全松开状态；鼠标拖动可旋转整机，滚轮可缩放。</small>
        </aside>
      </section>
    </main>
  );
};

export default PistonOscillationModelSizePreviewPage;
