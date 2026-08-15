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
import './PistonOscillationHoseDirectionPreviewPage.css';

const HOSE_RADIUS_M = 0.0025;
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
const CAMERA_DISTANCE_SCALE = 1.15;
const CAMERA_TARGET = new THREE.Vector3(0.145, 0.028, 0.13);
const OVERVIEW_SCHEME = PISTON_OSCILLATION_CAMERA_VIEW_SCHEMES.overview;
const CAMERA_POSITION = CAMERA_TARGET.clone().add(
  new THREE.Vector3(...OVERVIEW_SCHEME.direction).multiplyScalar(CAMERA_DISTANCE_SCALE),
);
const CAMERA_FORWARD_TABLETOP_DIRECTION = new THREE.Vector3(
  -OVERVIEW_SCHEME.direction[0],
  0,
  -OVERVIEW_SCHEME.direction[2],
).normalize();

const rotateTabletopDirectionInCameraView = (
  direction: THREE.Vector3,
  clockwiseDegrees: number,
) => {
  const cameraForward = CAMERA_TARGET.clone().sub(CAMERA_POSITION).normalize();
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

const setSubtreeMeshVisibility = (object: THREE.Object3D | undefined, visible: boolean) => {
  object?.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.visible = visible;
    mesh.castShadow = visible;
    mesh.receiveShadow = visible;
  });
};

const createPreviewReferenceModel = (sourceScene: THREE.Object3D) => {
  const root = sourceScene.clone(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });

  setSubtreeMeshVisibility(root.getObjectByName('PressureSensor_ROOT'), true);
  setSubtreeMeshVisibility(root.getObjectByName('Base_CastIron_LeftBeam'), true);
  setSubtreeMeshVisibility(root.getObjectByName('LevelFoot_L'), true);
  setSubtreeMeshVisibility(root.getObjectByName('LevelFoot_R'), true);
  root.updateWorldMatrix(true, true);
  return root;
};

const createPreviewBench = (sourceScene: THREE.Object3D) => {
  const bench = sourceScene.clone(true);
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

const getWorldPositionOrFallback = (
  root: THREE.Object3D,
  nodeName: string,
  fallback: THREE.Vector3,
) => {
  const object = root.getObjectByName(nodeName);
  return object ? object.getWorldPosition(new THREE.Vector3()) : fallback.clone();
};

const createHosePath = (referenceModel: THREE.Object3D) => {
  referenceModel.updateWorldMatrix(true, true);
  const sensorOutlet = getWorldPositionOrFallback(
    referenceModel,
    'ANCHOR_Hose_End',
    new THREE.Vector3(0.1988, 0.01944, 0.2811),
  );
  const sensorRoot = referenceModel.getObjectByName('PressureSensor_ROOT');
  const sensorQuaternion = sensorRoot
    ? sensorRoot.getWorldQuaternion(new THREE.Quaternion())
    : new THREE.Quaternion();
  const outletDirection = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(sensorQuaternion)
    .setY(0)
    .normalize();
  const rightFoot = getWorldPositionOrFallback(
    referenceModel,
    'LevelFoot_R',
    new THREE.Vector3(0.26875, 0.0195, 0.1912),
  );
  const apparatusOutsideDirection = new THREE.Vector3(
    -CAMERA_FORWARD_TABLETOP_DIRECTION.z,
    0,
    CAMERA_FORWARD_TABLETOP_DIRECTION.x,
  ).normalize();
  const directionReferencePoint = rightFoot
    .clone()
    .setY(TABLETOP_HOSE_CENTER_Y_M)
    .addScaledVector(apparatusOutsideDirection, HOSE_DIRECTION_REFERENCE_OFFSET_M);
  const screenVerticalTabletopDirection = directionReferencePoint
    .clone()
    .sub(new THREE.Vector3(CAMERA_POSITION.x, TABLETOP_HOSE_CENTER_Y_M, CAMERA_POSITION.z))
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

  // Mirrored endpoint handles keep curvature at zero where the bend meets both straight runs.
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
  const tabletopFarSegment = new THREE.LineCurve3(
    bendEnd,
    connectorLeadStart,
  );
  const connectorLead = new SmoothHeightLineCurve3(
    connectorLeadStart,
    detachedConnectorPosition,
  );
  const hoseCurve = new THREE.CurvePath<THREE.Vector3>();
  hoseCurve.add(combinedDescentAndTurn);
  hoseCurve.add(tabletopFarSegment);
  hoseCurve.add(connectorLead);

  return {
    curve: hoseCurve,
    detachedConnectorPosition,
    detachedConnectorDirection: farDirection,
  };
};

const createDetachedQuickDisconnect = (
  sourceScene: THREE.Object3D,
  position: THREE.Vector3,
  direction: THREE.Vector3,
) => {
  sourceScene.updateWorldMatrix(true, true);
  const hoseStartAnchor = getWorldPositionOrFallback(
    sourceScene,
    'ANCHOR_Hose_Start',
    new THREE.Vector3(0.07925, 0.2466, 0.1383),
  );
  const anchorTranslationInverse = new THREE.Matrix4().makeTranslation(
    -hoseStartAnchor.x,
    -hoseStartAnchor.y,
    -hoseStartAnchor.z,
  );
  const connector = new THREE.Group();
  connector.name = 'Detached_Main_QuickDisconnect';

  DETACHED_CONNECTOR_NODE_NAMES.forEach((nodeName) => {
    const sourceNode = sourceScene.getObjectByName(nodeName);
    if (!sourceNode) {
      throw new Error(`Piston-oscillation GLB is missing connector node: ${nodeName}`);
    }

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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    connector.add(detachedNode);
  });

  connector.position.copy(position);
  connector.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    direction.clone().normalize(),
  );
  connector.updateWorldMatrix(true, true);
  return connector;
};

const HoseDirectionModel = ({
  sourceScene,
  unifiedLightLabBenchSourceScene,
  onReady,
}: {
  sourceScene: THREE.Object3D;
  unifiedLightLabBenchSourceScene: THREE.Object3D;
  onReady: () => void;
}) => {
  const referenceModel = useMemo(
    () => createPreviewReferenceModel(sourceScene),
    [sourceScene],
  );
  const bench = useMemo(
    () => createPreviewBench(unifiedLightLabBenchSourceScene),
    [unifiedLightLabBenchSourceScene],
  );
  const hosePath = useMemo(() => createHosePath(referenceModel), [referenceModel]);
  const hoseGeometry = useMemo(
    () => new THREE.TubeGeometry(hosePath.curve, 180, HOSE_RADIUS_M, 14, false),
    [hosePath],
  );
  const detachedConnector = useMemo(
    () => createDetachedQuickDisconnect(
      sourceScene,
      hosePath.detachedConnectorPosition,
      hosePath.detachedConnectorDirection,
    ),
    [hosePath, sourceScene],
  );
  const hoseMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#20262b',
      roughness: 0.82,
      metalness: 0.03,
    }),
    [],
  );

  useEffect(() => () => {
    hoseGeometry.dispose();
    hoseMaterial.dispose();
  }, [hoseGeometry, hoseMaterial]);

  useLayoutEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <group>
      <primitive object={bench} dispose={null} />
      <primitive object={referenceModel} dispose={null} />
      <mesh geometry={hoseGeometry} material={hoseMaterial} castShadow />
      <primitive object={detachedConnector} dispose={null} />
    </group>
  );
};

const PreviewCameraRig = ({
  controlsRef,
  resetRevision,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  resetRevision: number;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const appliedPoseKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    appliedPoseKeyRef.current = null;
    invalidate();
  }, [invalidate, resetRevision]);

  useFrame(() => {
    const poseKey = `${resetRevision}:${size.width}:${size.height}`;
    if (appliedPoseKeyRef.current === poseKey) return;
    const controls = controlsRef.current;
    if (!(camera instanceof THREE.PerspectiveCamera) || !controls) return;
    const aspect = size.width / Math.max(1, size.height);
    const baseHalfFovRad = THREE.MathUtils.degToRad(OVERVIEW_SCHEME.fov / 2);
    const responsiveFov = aspect < 1
      ? Math.min(
          62,
          THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseHalfFovRad) / aspect)),
        )
      : OVERVIEW_SCHEME.fov;
    camera.position.copy(CAMERA_POSITION);
    camera.fov = responsiveFov;
    camera.near = 0.002;
    camera.far = 10;
    camera.updateProjectionMatrix();
    controls.target.copy(CAMERA_TARGET);
    controls.update();
    appliedPoseKeyRef.current = poseKey;
    invalidate();
  });

  return null;
};

export const PistonOscillationHoseDirectionPreviewPage = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);

  return (
    <main className="piston-hose-direction-preview-page">
      <section
        className="piston-hose-direction-preview-stage"
        aria-label="活塞振动法软管方向临时预览"
        data-piston-hose-preview-ready={modelReady ? 'true' : 'false'}
      >
        <Canvas
          shadows
          camera={{
            position: CAMERA_POSITION.toArray(),
            fov: OVERVIEW_SCHEME.fov,
            near: 0.002,
            far: 10,
          }}
          dpr={[1, 1.5]}
          frameloop="always"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl, camera }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
            camera.lookAt(CAMERA_TARGET);
            camera.updateProjectionMatrix();
          }}
        >
          <color attach="background" args={['#e8edf1']} />
          <hemisphereLight color="#ffffff" groundColor="#7b8791" intensity={2.2} />
          <directionalLight
            castShadow
            color="#fffdf7"
            intensity={2.2}
            position={[-1, -1.5, 2.2]}
          />
          <directionalLight color="#bfd6e6" intensity={1.2} position={[1.2, 1, 1.4]} />
          <Suspense fallback={null}>
            <PistonOscillationInstrumentAsset>
              {(sourceScene, unifiedLightLabBenchSourceScene) => (
                <HoseDirectionModel
                  sourceScene={sourceScene}
                  unifiedLightLabBenchSourceScene={unifiedLightLabBenchSourceScene}
                  onReady={handleModelReady}
                />
              )}
            </PistonOscillationInstrumentAsset>
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={CAMERA_TARGET.toArray()}
            enablePan
            enableRotate
            enableZoom
            minDistance={0.24}
            maxDistance={1.8}
            onChange={() => undefined}
          />
          <PreviewCameraRig controlsRef={controlsRef} resetRevision={resetRevision} />
        </Canvas>

        {!modelReady ? (
          <div className="piston-hose-direction-preview-loading" role="status">
            正在加载软管方向预览…
          </div>
        ) : null}

        <header className="piston-hose-direction-preview-header">
          <div>
            <span>活塞振动法 · 临时预览</span>
            <h1>断开后软管走向确认</h1>
            <p>仅显示真实传感器、软管、可拆接头和黑色三脚架定位参照；本页不代表最终整机尺寸。</p>
          </div>
          <button type="button" onClick={() => setResetRevision((value) => value + 1)}>
            恢复确认视角
          </button>
        </header>

        <aside className="piston-hose-direction-preview-notes" aria-label="软管路径说明">
          <strong>当前路径</strong>
          <ol>
            <li>从蓝色传感器接口平顺离开，在约原路径三分之一的距离内快速贴向桌面。</li>
            <li>在黑色三脚架右侧留出间隙后平顺贴合桌面。</li>
            <li>远端以主相机视线的桌面投影为基准，在画面内顺时针偏转约 40° 后延伸。</li>
            <li>软管末端保留随管取下的白色旋转卡扣接头，仪器固定口不随管移动。</li>
          </ol>
          <small>鼠标拖动可旋转视角，滚轮可缩放；软管位置不会随相机旋转改变。</small>
        </aside>
      </section>
    </main>
  );
};

export default PistonOscillationHoseDirectionPreviewPage;
