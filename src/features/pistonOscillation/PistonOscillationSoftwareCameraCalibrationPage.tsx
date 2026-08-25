import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  WORKBENCH_FRAME_HEIGHT,
  WORKBENCH_FRAME_WIDTH,
  WorkbenchAspectFrame,
} from '../../app/WorkbenchAspectFrame.tsx';
import {
  WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
} from '../workbench/workbenchState.ts';
import {
  PistonOscillationInteractionWorkspace,
  type PistonOscillationCameraCalibrationCapture,
  type PistonOscillationCameraCalibrationSnapshot,
  type PistonOscillationCameraCalibrationView,
} from './PistonOscillationFocusInteractionPreviewPage.tsx';
import {
  PISTON_EQUILIBRIUM_HEIGHT_MAX_MM,
  PISTON_EQUILIBRIUM_HEIGHT_MIN_MM,
  clampPistonEquilibriumHeightMm,
} from './pistonOscillationModelMotion.ts';
import { getPistonScaleReadingCenterHeightMm } from './pistonOscillationFocusViews.ts';
import { PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS } from './pistonOscillationCameraCalibrationReview.ts';
import '../workbench/WorkbenchStudioPrototype.css';
import './PistonOscillationPlaceholders.css';
import './PistonOscillationSoftwareCameraCalibrationPage.css';

const CALIBRATION_VIEWS: ReadonlyArray<{
  id: PistonOscillationCameraCalibrationView;
  label: string;
  description: string;
}> = [
  { id: 'overview', label: '默认视角', description: '正式 3D 主视图' },
  { id: 'pistonFocus', label: '活塞聚焦', description: '含左上角螺钉操作镜与右下角聚焦面板' },
  { id: 'hoseFocus', label: '软管聚焦', description: '含正式软管聚焦面板和操作提示' },
  {
    id: 'heightAdjustmentFocus',
    label: '高度调节',
    description: '主视角随顶部平台高度连续平移',
  },
  { id: 'screwOperationView', label: '螺钉操作镜', description: '只调整左上角小地图中的相机' },
  {
    id: 'scaleReadingView',
    label: '刻度读取操作镜',
    description: '正交视角跟随石墨活塞下沿，用于读取刻度',
  },
];

type CalibrationCaptureMap = Partial<Record<
  PistonOscillationCameraCalibrationView,
  PistonOscillationCameraCalibrationSnapshot
>>;

const getViewLabel = (view: PistonOscillationCameraCalibrationView) =>
  CALIBRATION_VIEWS.find((item) => item.id === view)?.label ?? view;

const formatSnapshot = (snapshot: PistonOscillationCameraCalibrationSnapshot | undefined) => (
  snapshot ? JSON.stringify(snapshot, null, 2) : '调整视角后，点击“记录当前视角”。'
);

export const PistonOscillationSoftwareCameraCalibrationPage = () => {
  const [selectedView, setSelectedView] = useState<PistonOscillationCameraCalibrationView>('overview');
  const [sceneRevision, setSceneRevision] = useState(0);
  const [captureHandler, setCaptureHandler] =
    useState<PistonOscillationCameraCalibrationCapture | null>(null);
  const [captures, setCaptures] = useState<CalibrationCaptureMap>(
    () => ({ ...PISTON_OSCILLATION_CAMERA_CALIBRATION_REVIEW_VIEWS }),
  );
  const [copied, setCopied] = useState(false);
  const [calibrationHeightMm, setCalibrationHeightMm] = useState(80);
  const [stageViewport, setStageViewport] = useState({ width: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);

  const liveWorkspaceStyle = useMemo(() => ({
    '--studio-live-preview-ratio': `${WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO * 100}%`,
    '--studio-live-realtime-ratio': `${(1 - WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO) * 100}%`,
  }) as CSSProperties, []);

  const handleCaptureHandlerChange = useCallback((handler: PistonOscillationCameraCalibrationCapture | null) => {
    setCaptureHandler(() => handler);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const update = () => {
      const canvas = stage.querySelector('canvas');
      setStageViewport({
        width: canvas?.offsetWidth ?? Math.max(0, stage.clientWidth - 2),
        height: canvas?.offsetHeight ?? Math.max(0, stage.clientHeight - 2),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    const mutationObserver = new MutationObserver(() => {
      const canvas = stage.querySelector('canvas');
      if (canvas) observer.observe(canvas);
      update();
    });
    mutationObserver.observe(stage, { childList: true, subtree: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const selectView = (view: PistonOscillationCameraCalibrationView) => {
    const reviewSnapshot = captures[view];
    if (reviewSnapshot?.calibrationHeightMm !== undefined) {
      setCalibrationHeightMm(reviewSnapshot.calibrationHeightMm);
    }
    setSelectedView(view);
    setCaptureHandler(null);
    setCopied(false);
    setSceneRevision((revision) => revision + 1);
  };

  const resetSelectedView = () => {
    setCaptureHandler(null);
    setCopied(false);
    setSceneRevision((revision) => revision + 1);
  };

  const captureSelectedView = () => {
    if (!captureHandler) return;
    const heightAware = selectedView === 'heightAdjustmentFocus'
      || selectedView === 'scaleReadingView';
    const snapshot = {
      ...captureHandler(),
      ...(heightAware ? {
        calibrationHeightMm,
        ...(selectedView === 'scaleReadingView' ? {
          scaleReadingCenterHeightMm: getPistonScaleReadingCenterHeightMm(
            calibrationHeightMm,
          ),
        } : {}),
      } : {}),
    };
    setCaptures((current) => ({ ...current, [selectedView]: snapshot }));
    setCopied(false);
  };

  const capturedCount = CALIBRATION_VIEWS.filter((view) => captures[view.id]).length;
  const exportPayload = useMemo(() => ({
    capturedAt: new Date().toISOString(),
    source: 'pistonSoftwareCameraCalibration',
    workspace: {
      logicalViewport: { width: WORKBENCH_FRAME_WIDTH, height: WORKBENCH_FRAME_HEIGHT },
      consoleHeight: 156,
      sidebars: 'collapsed',
      split: {
        preview: WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
        realtime: 1 - WORKBENCH_PISTON_OSCILLATION_SPLIT_DEFAULT_RATIO,
      },
    },
    views: Object.fromEntries(
      CALIBRATION_VIEWS
        .map((view) => [view.id, captures[view.id]])
        .filter((entry) => entry[1] !== undefined),
    ),
  }), [captures]);

  const copyCapturedViews = async () => {
    if (capturedCount === 0) return;
    await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
  };

  const selectedDefinition = CALIBRATION_VIEWS.find((view) => view.id === selectedView)!;
  const selectedSnapshot = captures[selectedView];
  const heightCalibrationSelected = selectedView === 'heightAdjustmentFocus'
    || selectedView === 'scaleReadingView';

  const selectCalibrationHeight = (heightMm: number) => {
    const nextHeightMm = clampPistonEquilibriumHeightMm(heightMm);
    setCalibrationHeightMm(nextHeightMm);
    setCopied(false);
  };

  return (
    <WorkbenchAspectFrame forceFixed>
      <div
        className="studio-workbench studio-theme-light piston-software-camera-calibration"
        data-workbench-language="zh-CN"
        data-piston-software-camera-calibration="true"
      >
        <div className="studio-shell" style={{ '--studio-console-height': '156px' } as CSSProperties}>
          <header className="studio-menu piston-camera-calibration-menu">
            <strong>气律实验室</strong>
            <span>实验文件</span>
            <span>编辑</span>
            <span>窗口</span>
            <span>设置</span>
            <span>帮助</span>
            <em>活塞振动法 · 软件实际尺寸相机标定</em>
          </header>

          <main className="studio-body studio-left-collapsed">
            <aside className="studio-sidebar" aria-hidden="true" />
            <button type="button" className="studio-rail-button studio-left-rail" tabIndex={-1}>
              打开文件
            </button>

            <section className="studio-layout" aria-label="相机标定工作台">
              <div className="studio-file-tabs">
                <div className="studio-file-tab studio-file-tab-selected studio-file-tab-active piston-camera-calibration-file-tab">
                  Piston Oscillation - 001
                </div>
              </div>

              <div className="studio-workspace-shell studio-workspace-shell-active studio-params-collapsed">
                <div className="studio-center-workspace studio-center-workspace-active">
                  <div className="studio-live-workspace" style={liveWorkspaceStyle}>
                    <section className="studio-dock-panel studio-fixed-panel">
                      <header className="studio-dock-header">
                        <div>
                          <span>3D 预览</span>
                          <small>实际仪器视口</small>
                        </div>
                        <output className="piston-camera-calibration-viewport-badge">
                          {stageViewport.width || '—'} × {stageViewport.height || '—'}
                        </output>
                      </header>
                      <div className="studio-preview studio-preview-piston-oscillation">
                        <div
                          ref={stageRef}
                          className="studio-preview-stage studio-piston-oscillation-preview-stage"
                        >
                          <section className="piston-oscillation-instrument-scene">
                            <PistonOscillationInteractionWorkspace
                              key={`${selectedView}:${sceneRevision}`}
                              embedded
                              initialMode={
                                selectedView === 'screwOperationView'
                                || selectedView === 'heightAdjustmentFocus'
                                || selectedView === 'scaleReadingView'
                                  ? 'pistonFocus'
                                  : selectedView
                              }
                              cameraPreset="overview"
                              cameraCalibrationView={selectedView}
                              cameraCalibrationHeightMm={
                                heightCalibrationSelected ? calibrationHeightMm : undefined
                              }
                              cameraCalibrationInitialSnapshot={selectedSnapshot}
                              cameraCalibrationReviewSnapshots={captures}
                              onCameraCalibrationCaptureHandlerChange={handleCaptureHandlerChange}
                              sceneTheme="light"
                            />
                            <button
                              type="button"
                              className="studio-heat-view-reset piston-oscillation-view-reset"
                              onClick={resetSelectedView}
                            >
                              默认视角
                            </button>
                          </section>
                        </div>
                      </div>
                    </section>

                    <div className="studio-live-workspace-resizer" aria-hidden="true" />

                    <section className="studio-dock-panel studio-fixed-panel">
                      <header className="studio-dock-header">
                        <div>
                          <span>相机标定</span>
                          <small>与正式软件同尺寸</small>
                        </div>
                        <strong>{capturedCount}/{CALIBRATION_VIEWS.length} 已记录</strong>
                      </header>
                      <div className="piston-camera-calibration-panel">
                        <section className="piston-camera-calibration-section">
                          <h2>选择视角</h2>
                          <div className="piston-camera-calibration-view-list">
                            {CALIBRATION_VIEWS.map((view) => (
                              <button
                                type="button"
                                key={view.id}
                                aria-pressed={selectedView === view.id}
                                onClick={() => selectView(view.id)}
                              >
                                <span>{view.label}</span>
                                <small>{view.description}</small>
                                <b>{captures[view.id] ? '已记录' : '待记录'}</b>
                              </button>
                            ))}
                          </div>
                        </section>

                        <section className="piston-camera-calibration-section piston-camera-calibration-current">
                          <div>
                            <h2>{selectedDefinition.label}</h2>
                            <p>{selectedDefinition.description}</p>
                          </div>
                          <dl>
                            <div>
                              <dt>正式工作台</dt>
                              <dd>{WORKBENCH_FRAME_WIDTH} × {WORKBENCH_FRAME_HEIGHT}</dd>
                            </div>
                            <div><dt>3D 实际视口</dt><dd>{stageViewport.width} × {stageViewport.height}</dd></div>
                            <div><dt>默认分屏</dt><dd>56.605% / 43.395%</dd></div>
                          </dl>
                          <p className="piston-camera-calibration-help">
                            左键拖动旋转，右键拖动平移，滚轮缩放。选择操作镜视角时，只调整左上角操作镜。
                          </p>
                          {heightCalibrationSelected ? (
                            <div className="piston-camera-calibration-height-control">
                              <div className="piston-camera-calibration-height-heading">
                                <span>动态跟随高度</span>
                                <output>{calibrationHeightMm.toFixed(1)} mm</output>
                              </div>
                              <input
                                type="range"
                                aria-label="动态跟随高度"
                                min={PISTON_EQUILIBRIUM_HEIGHT_MIN_MM}
                                max={PISTON_EQUILIBRIUM_HEIGHT_MAX_MM}
                                step="0.1"
                                value={calibrationHeightMm}
                                onChange={(event) => selectCalibrationHeight(
                                  Number(event.currentTarget.value),
                                )}
                              />
                              <div className="piston-camera-calibration-height-presets">
                                {[20, 50, 80].map((heightMm) => (
                                  <button
                                    type="button"
                                    key={heightMm}
                                    aria-pressed={Math.abs(calibrationHeightMm - heightMm) < 0.001}
                                    onClick={() => selectCalibrationHeight(heightMm)}
                                  >
                                    {heightMm} mm
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="piston-camera-calibration-actions">
                            <button type="button" onClick={resetSelectedView}>恢复该视角</button>
                            <button
                              type="button"
                              className="is-primary"
                              disabled={!captureHandler}
                              onClick={captureSelectedView}
                            >
                              记录当前视角
                            </button>
                          </div>
                        </section>

                        <section className="piston-camera-calibration-section piston-camera-calibration-output">
                          <div className="piston-camera-calibration-output-heading">
                            <h2>{getViewLabel(selectedView)}参数</h2>
                            <button
                              type="button"
                              disabled={capturedCount === 0}
                              onClick={() => void copyCapturedViews()}
                            >
                              {
                                copied
                                  ? '已复制'
                                  : `复制全部（${capturedCount}/${CALIBRATION_VIEWS.length}）`
                              }
                            </button>
                          </div>
                          <pre>{formatSnapshot(selectedSnapshot)}</pre>
                        </section>
                      </div>
                    </section>
                  </div>
                </div>

                <button type="button" className="studio-rail-button studio-right-rail" tabIndex={-1}>
                  当前参数
                </button>
              </div>
            </section>
          </main>

          <section className="studio-console" aria-label="控制台 / 输出">
            <div className="studio-console-header">
              <span>控制台 / 输出</span>
              <div className="studio-console-tabs"><button type="button">日志</button></div>
            </div>
            <div className="studio-console-body">
              <div className="studio-log">
                <span className="studio-log-time">标定</span>
                <span className="studio-log-kind-info">信息</span>
                <span>当前页面复用正式工作台、分屏、3D 舞台和聚焦覆盖层尺寸。</span>
              </div>
            </div>
          </section>

          <footer className="studio-status">
            <span>当前文件：Piston Oscillation - 001</span>
            <span>开发工具 · 相机参数仅在记录后写入剪贴板</span>
          </footer>
        </div>
      </div>
    </WorkbenchAspectFrame>
  );
};

export default PistonOscillationSoftwareCameraCalibrationPage;
