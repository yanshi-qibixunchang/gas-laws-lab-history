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
const QUICK_DISCONNECT_NODE_NAME = 'Connector_Main_QuickDisconnect';
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
const LOCKING_SCREW_PREVIEW_TURNS = 1.5;
const TABLETOP_HOSE_CENTER_Y_M = HOSE_RADIUS_M + 0.00035;
const HOSE_FAR_SCREEN_CLOCKWISE_DEG = 40;
const HOSE_DIRECTION_REFERENCE_OFFSET_M = 0.058;
const HOSE_SINGLE_BEND_OUTSIDE_OFFSET_M = 0.1;
const HOSE_SINGLE_BEND_EXIT_ADVANCE_M = 0.04;
const HOSE_SINGLE_BEND_HANDLE_M = 0.055;
const HOSE_DESCENT_COMPLETION_T = 0.325;
const HOSE_FAR_SEGMENT_LENGTH_M = 0.3;
const HOSE_CONNECTOR_LEAD_LENGTH_M = 0.055;
const DETACHED_CONNECTOR_AXIS_HEIGHT_M = 0.01135;
const DETACHED_CONNECTOR_NODE_NAMES = [
  'Connector_Main_Grip_00',
  'Connector_Main_Grip_01',
  'Connector_Main_Grip_02',
  'Connector_Main_Grip_03',
  'Connector_Main_Grip_04',
  'Connector_Main_Grip_05',
  'Connector_Main_RotatingCollar',
  'Connector_Main_ThreadedStem',
  'Connector_Main_White',
] as const;
const HOSE_PREVIEW_CAMERA_TARGET = new THREE.Vector3(0.145, 0.028, 0.13);
const HOSE_PREVIEW_CAMERA_POSITION = HOSE_PREVIEW_CAMERA_TARGET.clone().add(
  new THREE.Vector3(...PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview.direction)
    .multiplyScalar(1.15),
);
const HOSE_PREVIEW_CAMERA_FORWARD_TABLETOP_DIRECTION = new THREE.Vector3(
  -PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview.direction[0],
  0,
  -PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview.direction[2],
).normalize();
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

type PreviewMode = 'hose' | 'lockingScrew' | 'scale' | 'corrected' | 'source';
type HosePreviewState = 'connected' | 'disconnected';

interface PreviewBounds {
  center: THREE.Vector3;
  span: number;
}

interface OwnedPreviewModel {
  root: THREE.Object3D;
  bounds: PreviewBounds;
  ownedMaterials: Set<THREE.Material>;
  ownedGeometries: Set<THREE.BufferGeometry>;
  lockingScrewMovingPart: THREE.Group | null;
  connectedHose: THREE.Object3D | null;
  quickDisconnect: THREE.Object3D | null;
  detachedHoseAssembly: THREE.Group | null;
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

const rotateTabletopDirectionInCameraView = (
  direction: THREE.Vector3,
  clockwiseDegrees: number,
) => {
  const cameraForward = HOSE_PREVIEW_CAMERA_TARGET
    .clone()
    .sub(HOSE_PREVIEW_CAMERA_POSITION)
    .normalize();
  const cameraRight = cameraForward
    .clone()
    .cross(new THREE.Vector3(0, 1, 0))
    .normalize();
  const cameraUp = cameraRight.clone().cross(cameraForward).normalize();
  const sourceScreenDirection = new THREE.Vector2(
    direction.dot(cameraRight),
    direction.dot(cameraUp),
  );
  const angle = THREE.MathUtils.degToRad(clockwiseDegrees);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const targetScreenDirection = new THREE.Vector2(
    cosAngle * sourceScreenDirection.x + sinAngle * sourceScreenDirection.y,
    -sinAngle * sourceScreenDirection.x + cosAngle * sourceScreenDirection.y,
  ).normalize();
  const determinant = cameraRight.x * cameraUp.z - cameraRight.z * cameraUp.x;

  return new THREE.Vector3(
    (
      targetScreenDirection.x * cameraUp.z
      - cameraRight.z * targetScreenDirection.y
    ) / determinant,
    0,
    (
      cameraRight.x * targetScreenDirection.y
      - targetScreenDirection.x * cameraUp.x
    ) / determinant,
  ).normalize();
};

const quinticSmoothStep = (value: number) => {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);
  return clampedValue ** 3 * (
    10 - 15 * clampedValue + 6 * clampedValue * clampedValue
  );
};

class QuinticBezierCurve3 extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly controlPoints: readonly [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ],
    private readonly heightProfile?: {
      startY: number;
      endY: number;
      completionT: number;
    },
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const inverseT = 1 - t;
    const inverseT2 = inverseT * inverseT;
    const inverseT3 = inverseT2 * inverseT;
    const t2 = t * t;
    const t3 = t2 * t;
    const [point0, point1, point2, point3, point4, point5] = this.controlPoints;

    target
      .set(0, 0, 0)
      .addScaledVector(point0, inverseT3 * inverseT2)
      .addScaledVector(point1, 5 * inverseT3 * inverseT * t)
      .addScaledVector(point2, 10 * inverseT3 * t2)
      .addScaledVector(point3, 10 * inverseT2 * t3)
      .addScaledVector(point4, 5 * inverseT * t3 * t)
      .addScaledVector(point5, t3 * t2);

    if (this.heightProfile) {
      const heightProgress = quinticSmoothStep(t / this.heightProfile.completionT);
      target.y = THREE.MathUtils.lerp(
        this.heightProfile.startY,
        this.heightProfile.endY,
        heightProgress,
      );
    }

    return target;
  }
}

class SmoothHeightLineCurve3 extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly start: THREE.Vector3,
    private readonly end: THREE.Vector3,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    target.lerpVectors(this.start, this.end, t);
    target.y = THREE.MathUtils.lerp(
      this.start.y,
      this.end.y,
      quinticSmoothStep(t),
    );
    return target;
  }
}

const createDisconnectedHosePath = (root: THREE.Object3D) => {
  root.updateWorldMatrix(true, true);
  const sensorOutlet = getWorldPosition(root, 'ANCHOR_Hose_End');
  const sensorRoot = getRequiredObject(root, 'PressureSensor_ROOT');
  const sensorQuaternion = sensorRoot.getWorldQuaternion(new THREE.Quaternion());
  const outletDirection = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(sensorQuaternion)
    .setY(0)
    .normalize();
  const rightFoot = getWorldPosition(root, 'LevelFoot_R');
  const apparatusOutsideDirection = new THREE.Vector3(
    -HOSE_PREVIEW_CAMERA_FORWARD_TABLETOP_DIRECTION.z,
    0,
    HOSE_PREVIEW_CAMERA_FORWARD_TABLETOP_DIRECTION.x,
  ).normalize();
  const directionReferencePoint = rightFoot
    .clone()
    .setY(TABLETOP_HOSE_CENTER_Y_M)
    .addScaledVector(apparatusOutsideDirection, HOSE_DIRECTION_REFERENCE_OFFSET_M);
  const screenVerticalTabletopDirection = directionReferencePoint
    .clone()
    .sub(new THREE.Vector3(
      HOSE_PREVIEW_CAMERA_POSITION.x,
      TABLETOP_HOSE_CENTER_Y_M,
      HOSE_PREVIEW_CAMERA_POSITION.z,
    ))
    .setY(0)
    .normalize();
  const farDirection = rotateTabletopDirectionInCameraView(
    screenVerticalTabletopDirection,
    HOSE_FAR_SCREEN_CLOCKWISE_DEG,
  );
  const bendEnd = rightFoot
    .clone()
    .setY(TABLETOP_HOSE_CENTER_Y_M)
    .addScaledVector(apparatusOutsideDirection, HOSE_SINGLE_BEND_OUTSIDE_OFFSET_M)
    .addScaledVector(farDirection, HOSE_SINGLE_BEND_EXIT_ADVANCE_M);
  const bendStartHandle = sensorOutlet
    .clone()
    .addScaledVector(outletDirection, HOSE_SINGLE_BEND_HANDLE_M);
  const bendStartAcceleration = sensorOutlet
    .clone()
    .addScaledVector(outletDirection, HOSE_SINGLE_BEND_HANDLE_M * 2);
  const bendEndAcceleration = bendEnd
    .clone()
    .addScaledVector(farDirection, HOSE_SINGLE_BEND_HANDLE_M * -2);
  const bendEndHandle = bendEnd
    .clone()
    .addScaledVector(farDirection, -HOSE_SINGLE_BEND_HANDLE_M);
  const combinedDescentAndTurn = new QuinticBezierCurve3([
    sensorOutlet,
    bendStartHandle,
    bendStartAcceleration,
    bendEndAcceleration,
    bendEndHandle,
    bendEnd,
  ], {
    startY: sensorOutlet.y,
    endY: TABLETOP_HOSE_CENTER_Y_M,
    completionT: HOSE_DESCENT_COMPLETION_T,
  });
  const detachedConnectorPosition = bendEnd
    .clone()
    .addScaledVector(farDirection, HOSE_FAR_SEGMENT_LENGTH_M)
    .setY(DETACHED_CONNECTOR_AXIS_HEIGHT_M);
  const connectorLeadStart = detachedConnectorPosition
    .clone()
    .addScaledVector(farDirection, -HOSE_CONNECTOR_LEAD_LENGTH_M)
    .setY(TABLETOP_HOSE_CENTER_Y_M);
  const hoseCurve = new THREE.CurvePath<THREE.Vector3>();
  hoseCurve.add(combinedDescentAndTurn);
  hoseCurve.add(new THREE.LineCurve3(bendEnd, connectorLeadStart));
  hoseCurve.add(new SmoothHeightLineCurve3(connectorLeadStart, detachedConnectorPosition));

  return {
    curve: hoseCurve,
    detachedConnectorPosition,
    detachedConnectorDirection: farDirection,
  };
};

const createDetachedQuickDisconnect = (
  root: THREE.Object3D,
  position: THREE.Vector3,
  direction: THREE.Vector3,
) => {
  root.updateWorldMatrix(true, true);
  const bodyPivot = getWorldPosition(root, INSTRUMENT_BODY_ROOT_NODE_NAME);
  const hoseStartAnchor = transformPointAroundPivot(
    getWorldPosition(root, 'ANCHOR_Hose_Start'),
    bodyPivot,
    INSTRUMENT_BODY_CORRECTION_FACTOR,
  );
  const anchorTranslationInverse = new THREE.Matrix4().makeTranslation(
    -hoseStartAnchor.x,
    -hoseStartAnchor.y,
    -hoseStartAnchor.z,
  );
  const connector = new THREE.Group();
  connector.name = 'Detached_Main_QuickDisconnect_Preview';

  DETACHED_CONNECTOR_NODE_NAMES.forEach((nodeName) => {
    const sourceNode = getRequiredObject(root, nodeName);
    const detachedNode = sourceNode.clone(true);
    const relativeMatrix = anchorTranslationInverse.clone().multiply(sourceNode.matrixWorld);
    relativeMatrix.decompose(
      detachedNode.position,
      detachedNode.quaternion,
      detachedNode.scale,
    );
    detachedNode.visible = true;
    detachedNode.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => undefined;
    });
    connector.add(detachedNode);
  });

  connector.position.copy(position);
  connector.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    direction.clone().normalize(),
  );
  return connector;
};

const createDetachedHoseAssembly = (
  root: THREE.Object3D,
  ownedMaterials: Set<THREE.Material>,
  ownedGeometries: Set<THREE.BufferGeometry>,
) => {
  const path = createDisconnectedHosePath(root);
  const hoseGeometry = new THREE.TubeGeometry(path.curve, 180, HOSE_RADIUS_M, 14, false);
  const hoseMaterial = new THREE.MeshStandardMaterial({
    color: '#20262b',
    roughness: 0.82,
    metalness: 0.03,
  });
  ownedGeometries.add(hoseGeometry);
  ownedMaterials.add(hoseMaterial);
  const hose = new THREE.Mesh(hoseGeometry, hoseMaterial);
  hose.name = 'Hose_Main_Disconnected_Preview';
  hose.castShadow = false;
  hose.receiveShadow = false;
  hose.raycast = () => undefined;
  const connector = createDetachedQuickDisconnect(
    root,
    path.detachedConnectorPosition,
    path.detachedConnectorDirection,
  );
  const assembly = new THREE.Group();
  assembly.name = 'Hose_Main_DisconnectedAssembly_Preview';
  assembly.userData = {
    component: 'main_pressure_hose',
    previewState: 'disconnected_open_to_atmosphere',
    interactionDeferred: true,
  };
  assembly.add(hose, connector);
  return assembly;
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
  const pistonRod = getRequiredObject(root, 'PistonRod');
  const massPlatform = getRequiredObject(root, 'MassPlatform');
  const pistonBounds = new THREE.Box3().setFromObject(piston);
  const pistonRodBounds = new THREE.Box3().setFromObject(pistonRod);
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
  const targetTopSlabTopY = targetTopSlabCenterY + topSlabHeight / 2;
  const targetPistonRodHeight = targetTopSlabTopY - scaleZeroWorldY - pistonHeight;
  const targetPistonRodMinY = pistonBounds.max.y;
  const targetPistonRodMaxY = targetPistonRodMinY + targetPistonRodHeight;

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
  const massPlatformWorldY = massPlatform.getWorldPosition(new THREE.Vector3()).y;
  moveObjectWorldY(
    root,
    massPlatform,
    massPlatformWorldY + targetPistonRodMaxY - pistonRodBounds.max.y,
  );
  resizeObjectWorldY(
    root,
    pistonRod,
    targetPistonRodMinY,
    targetPistonRodMaxY,
  );

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
  const movingPart = new THREE.Group();
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
  movingPart.name = 'PistonLockingScrew_MovingPart_Preview';
  movingPart.userData = {
    loosePositionX: 0,
    tightTravelM: LOCKING_SCREW_CONTACT_GAP_M,
    previewTurns: LOCKING_SCREW_PREVIEW_TURNS,
  };
  assembly.add(movingPart);

  const addAxialMesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    localX: number,
    parent: THREE.Object3D = movingPart,
  ) => {
    ownedGeometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.x = localX;
    mesh.rotation.z = -Math.PI / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => undefined;
    parent.add(mesh);
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
    assembly,
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
    movingPart.add(groove);
  });

  const witnessMarkGeometry = new THREE.BoxGeometry(0.00035, 0.0028, 0.00055);
  ownedGeometries.add(witnessMarkGeometry);
  const witnessMark = new THREE.Mesh(witnessMarkGeometry, shaftMaterial);
  witnessMark.name = 'PistonLockingScrew_RotationWitnessMark_Preview';
  witnessMark.position.set(
    knobCenterX + LOCKING_SCREW_KNOB_DEPTH_M / 2 + 0.00012,
    LOCKING_SCREW_KNOB_RADIUS_M * 0.45,
    0,
  );
  witnessMark.castShadow = false;
  witnessMark.receiveShadow = false;
  witnessMark.raycast = () => undefined;
  movingPart.add(witnessMark);

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
  return movingPart;
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
  let lockingScrewMovingPart: THREE.Group | null = null;
  let connectedHose: THREE.Object3D | null = null;
  let quickDisconnect: THREE.Object3D | null = null;
  let detachedHoseAssembly: THREE.Group | null = null;
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
    connectedHose = correctedExternalHose.hose;
    if (mode === 'scale' || mode === 'lockingScrew' || mode === 'hose') {
      root.updateWorldMatrix(true, true);
      applyScaleCalibration(root, ownedGeometries);
    }
    if (mode === 'lockingScrew' || mode === 'hose') {
      lockingScrewMovingPart = createPistonLockingScrewPreview(root, ownedGeometries);
    }
    if (mode === 'hose') {
      quickDisconnect = getRequiredObject(root, QUICK_DISCONNECT_NODE_NAME);
      connectedHose.userData = {
        ...connectedHose.userData,
        previewState: 'connected_sealed',
      };
    }
  }

  root.updateWorldMatrix(true, true);
  const bounds = measurePreviewModel(root);
  if (mode === 'hose') {
    detachedHoseAssembly = createDetachedHoseAssembly(
      root,
      ownedMaterials,
      ownedGeometries,
    );
    detachedHoseAssembly.visible = false;
    root.add(detachedHoseAssembly);
  }
  root.add(createPreviewBench(unifiedLightLabBenchSourceScene));
  return {
    root,
    bounds,
    ownedMaterials,
    ownedGeometries,
    lockingScrewMovingPart,
    connectedHose,
    quickDisconnect,
    detachedHoseAssembly,
  };
};

const FullModelPreview = ({
  sourceScene,
  unifiedLightLabBenchSourceScene,
  mode,
  lockingScrewProgress,
  hoseState,
  onBoundsReady,
}: {
  sourceScene: THREE.Object3D;
  unifiedLightLabBenchSourceScene: THREE.Object3D;
  mode: PreviewMode;
  lockingScrewProgress: number;
  hoseState: HosePreviewState;
  onBoundsReady: (bounds: PreviewBounds) => void;
}) => {
  const ownedModel = useMemo(
    () => createPreviewModel(sourceScene, unifiedLightLabBenchSourceScene, mode),
    [mode, sourceScene, unifiedLightLabBenchSourceScene],
  );

  useLayoutEffect(() => {
    onBoundsReady(ownedModel.bounds);
  }, [onBoundsReady, ownedModel.bounds]);

  useLayoutEffect(() => {
    const movingPart = ownedModel.lockingScrewMovingPart;
    if (!movingPart) return;
    movingPart.position.x = -LOCKING_SCREW_CONTACT_GAP_M * lockingScrewProgress;
    movingPart.rotation.x = -Math.PI * 2 * LOCKING_SCREW_PREVIEW_TURNS
      * lockingScrewProgress;
    movingPart.parent!.userData.previewState = lockingScrewProgress <= 0.001
      ? 'loose'
      : lockingScrewProgress >= 0.999
        ? 'tight'
        : 'transition';
    movingPart.updateWorldMatrix(true, true);
  }, [lockingScrewProgress, ownedModel]);

  useLayoutEffect(() => {
    const { connectedHose, quickDisconnect, detachedHoseAssembly } = ownedModel;
    if (!connectedHose || !quickDisconnect || !detachedHoseAssembly) return;
    const connected = hoseState === 'connected';
    connectedHose.visible = connected;
    quickDisconnect.visible = connected;
    detachedHoseAssembly.visible = !connected;
    quickDisconnect.userData.previewState = connected
      ? 'connected_sealed'
      : 'disconnected_open_to_atmosphere';
    ownedModel.root.updateWorldMatrix(true, true);
  }, [hoseState, ownedModel]);

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
  const [mode, setMode] = useState<PreviewMode>('hose');
  const [bounds, setBounds] = useState<PreviewBounds | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [lockingScrewProgress, setLockingScrewProgress] = useState(0);
  const [hoseState, setHoseState] = useState<HosePreviewState>('connected');
  const handleBoundsReady = useCallback((nextBounds: PreviewBounds) => {
    setBounds(nextBounds);
    setModelReady(true);
  }, []);
  const selectMode = useCallback((nextMode: PreviewMode) => {
    setModelReady(false);
    setBounds(null);
    setMode(nextMode);
    setLockingScrewProgress(0);
    setHoseState('connected');
    setResetRevision((value) => value + 1);
  }, []);
  const calibratedMode = mode === 'hose' || mode === 'lockingScrew' || mode === 'scale';
  const lockingScrewStateLabel = lockingScrewProgress <= 0.001
    ? '完全松开'
    : lockingScrewProgress >= 0.999
      ? '完全旋紧'
      : '旋紧过程中';

  return (
    <main className="piston-model-size-preview-page">
      <section
        className="piston-model-size-preview-stage"
        aria-label="活塞振动法软管连接与断开双状态整机临时预览"
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
                  lockingScrewProgress={lockingScrewProgress}
                  hoseState={hoseState}
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
            <span>活塞振动法 · 整机模型第五阶段</span>
            <h1>软管连接与断开双状态整机预览</h1>
            <p>
              已按上部框架缩短量同步裁短活塞杆并下移顶部按压组件；本断点把已确认的
              断开软管形态迁入完整整机，只检查接通与断开两种实体状态。
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
              aria-pressed={mode === 'hose'}
              onClick={() => selectMode('hose')}
            >
              软管双状态
            </button>
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
              <dd>{mode === 'lockingScrew'
                ? lockingScrewStateLabel
                : mode === 'hose'
                  ? '完全松开'
                  : '未显示'}</dd>
            </div>
            <div>
              <dt>软管状态</dt>
              <dd>{mode === 'hose'
                ? hoseState === 'connected'
                  ? '接通密封'
                  : '断开通大气'
                : '固定形态'}</dd>
            </div>
          </dl>
          {mode === 'hose' ? (
            <section className="piston-hose-state-preview" aria-label="软管双状态预览">
              <strong>实体状态审查</strong>
              <div className="piston-hose-state-endpoints" role="group" aria-label="选择软管实体状态">
                <button
                  type="button"
                  aria-pressed={hoseState === 'connected'}
                  onClick={() => setHoseState('connected')}
                >
                  接通密封
                </button>
                <button
                  type="button"
                  aria-pressed={hoseState === 'disconnected'}
                  onClick={() => setHoseState('disconnected')}
                >
                  断开通大气
                </button>
              </div>
              <small>切换时固定接口留在仪器上；白色卡扣接头随软管一起取下。</small>
            </section>
          ) : null}
          {mode === 'lockingScrew' ? (
            <section className="piston-locking-screw-motion-preview" aria-label="锁紧螺钉动作预览">
              <strong>动作轨迹审查</strong>
              <div className="piston-locking-screw-endpoints" role="group" aria-label="选择锁紧螺钉端点">
                <button
                  type="button"
                  aria-pressed={lockingScrewProgress <= 0.001}
                  onClick={() => setLockingScrewProgress(0)}
                >
                  完全松开
                </button>
                <button
                  type="button"
                  aria-pressed={lockingScrewProgress >= 0.999}
                  onClick={() => setLockingScrewProgress(1)}
                >
                  完全旋紧
                </button>
              </div>
              <label htmlFor="piston-locking-screw-progress">
                <span>旋转—进退轨迹</span>
                <output>{Math.round(lockingScrewProgress * 100)}%</output>
              </label>
              <input
                id="piston-locking-screw-progress"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(lockingScrewProgress * 100)}
                onChange={(event) => setLockingScrewProgress(Number(event.target.value) / 100)}
              />
              <small>
                审查值：轴向 {formatMillimeters(LOCKING_SCREW_CONTACT_GAP_M * lockingScrewProgress)}
                {' · '}旋转 {(LOCKING_SCREW_PREVIEW_TURNS * lockingScrewProgress).toFixed(2)} 圈
              </small>
            </section>
          ) : null}
        </aside>

        <aside className="piston-model-size-preview-notes" aria-label="软管双状态阶段调整范围">
          <strong>本断点请审查</strong>
          <p>接通时维持整机原有密封路径；断开时采用已确认的桌面走向，软管与白色旋转卡扣作为一个实体落在桌面上。</p>
          <strong>本断点暂不加入</strong>
          <p>半透明拖拽幽灵、磁吸区、双击聚焦和松手后的状态判定。</p>
          <small>请用右侧按钮反复切换两种实体状态，并顺带检查缩短后的活塞杆与顶部按压组件比例。</small>
        </aside>
      </section>
    </main>
  );
};

export default PistonOscillationModelSizePreviewPage;
