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
const BODY_HEIGHT_FOLLOWER_NODE_NAMES = [
  'RodClampBridge',
  'RodClampKnob',
  'RodClampMount',
  'AXIS_RodClamp',
] as const;

type PreviewMode = 'corrected' | 'source';

interface PreviewBounds {
  center: THREE.Vector3;
  span: number;
}

interface OwnedPreviewModel {
  root: THREE.Object3D;
  bounds: PreviewBounds;
  ownedMaterials: Set<THREE.Material>;
  generatedGeometry: THREE.BufferGeometry | null;
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

  let generatedGeometry: THREE.BufferGeometry | null = null;
  if (mode === 'corrected') {
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
    generatedGeometry = correctedExternalHose.geometry;
    root.add(correctedExternalHose.hose);
  }

  root.updateWorldMatrix(true, true);
  const bounds = measurePreviewModel(root);
  root.add(createPreviewBench(unifiedLightLabBenchSourceScene));
  return { root, bounds, ownedMaterials, generatedGeometry };
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
    ownedModel.generatedGeometry?.dispose();
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
  const [mode, setMode] = useState<PreviewMode>('corrected');
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

  return (
    <main className="piston-model-size-preview-page">
      <section
        className="piston-model-size-preview-stage"
        aria-label="活塞振动法整机尺寸校正临时预览"
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
            <span>活塞振动法 · 整机模型第一阶段</span>
            <h1>仪器本体尺寸与比例校正</h1>
            <p>
              本页只校正热机本体及其从属连接件；支撑架、传感器与采集接口保持原尺寸，
              刻度和侧面锁紧旋钮留待后续单独验收。
            </p>
          </div>
          <button type="button" onClick={() => setResetRevision((value) => value + 1)}>
            恢复确认视角
          </button>
        </header>

        <aside className="piston-model-size-preview-controls" aria-label="尺寸版本切换">
          <strong>尺寸版本</strong>
          <div role="group" aria-label="选择尺寸版本">
            <button
              type="button"
              aria-pressed={mode === 'corrected'}
              onClick={() => selectMode('corrected')}
            >
              校正后
            </button>
            <button
              type="button"
              aria-pressed={mode === 'source'}
              onClick={() => selectMode('source')}
            >
              原模型对照
            </button>
          </div>
          <dl>
            <div>
              <dt>官方活塞直径</dt>
              <dd>{formatMillimeters(OFFICIAL_PISTON_DIAMETER_M)}</dd>
            </div>
            <div>
              <dt>原模型活塞直径</dt>
              <dd>{formatMillimeters(SOURCE_PISTON_DIAMETER_M)}</dd>
            </div>
            <div>
              <dt>本体比例</dt>
              <dd>{mode === 'corrected' ? '73.13%' : '100.00%'}</dd>
            </div>
          </dl>
        </aside>

        <aside className="piston-model-size-preview-notes" aria-label="本阶段调整范围">
          <strong>本阶段已联动</strong>
          <p>玻璃缸、石墨活塞、载物平台、防护框、本体固定接口和内部软管。</p>
          <strong>本阶段未加入</strong>
          <p>20–85 mm 新刻度、80 mm 以上数字清理、侧面锁紧旋钮及其状态。</p>
          <small>鼠标拖动可旋转，滚轮可缩放；可随时切换原模型作同视角对照。</small>
        </aside>
      </section>
    </main>
  );
};

export default PistonOscillationModelSizePreviewPage;
