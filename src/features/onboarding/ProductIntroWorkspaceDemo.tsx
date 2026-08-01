import { Bounds, Clone } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import {
  Activity,
  Archive,
  BookOpenText,
  ChevronDown,
  Columns,
  Database,
  FilePlus2,
  FileText,
  FlaskConical,
  FolderOpen,
  Gauge,
  Minus,
  MousePointer2,
  PanelLeft,
  Settings,
  SlidersHorizontal,
  Square,
  Undo2,
  Wrench,
  X,
} from 'lucide-react';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type * as THREE from 'three';
import { HeatCapacityUltraInstrumentAsset } from '../heatCapacity/HeatCapacityUltraInstrumentModel.tsx';
import { getWorkbenchAppBrandName } from '../workbench/workbenchBrand.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import {
  PRODUCT_INTRO_WORKSPACE_BASE_DEMO_MS,
  PRODUCT_INTRO_WORKSPACE_DEMO_MS,
  PRODUCT_INTRO_WORKSPACE_POINTER_TIMELINE_MS,
  PRODUCT_INTRO_WORKSPACE_POST_CLICK_DELAY_MS,
} from './productIntroCarouselModel.ts';

interface ProductIntroWorkspaceDemoProps {
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  language: WorkbenchLanguagePreference;
  onComplete: () => void;
}

interface ProductIntroWorkspaceDemoCopy {
  experimentFiles: string;
  edit: string;
  window: string;
  settings: string;
  help: string;
  openFiles: string;
  hide: string;
  files: string;
  panels: string;
  noOpenFile: string;
  noOpenFileHint: string;
  noPanelHint: string;
  selectHint: string;
  openHint: string;
  noOpenTab: string;
  noOpenStudy: string;
  emptyTitle: string;
  emptyBody: string;
  createIdeal: string;
  createHeatCapacity: string;
  createPiston: string;
  createStandard: string;
  openExperiment: string;
  noCachedExperiments: string;
  fileName: string;
  fileKind: string;
  panelTreeTitle: string;
  preview: string;
  realtime: string;
  heatCapacityExperiment: string;
  materials: string;
  guide: string;
  results: string;
  review: string;
  locked: string;
  closed: string;
  previewSubtitle: string;
  demoMode: string;
  guidedMode: string;
  freeMode: string;
  parameters: string;
  pressure: string;
  temperature: string;
  sensorSignal: string;
  phase: string;
  notPowered: string;
  safe: string;
  currentPrompt: string;
  powerPrompt: string;
  consoleOutput: string;
  logs: string;
  warnings: string;
  summary: string;
  info: string;
  success: string;
  warning: string;
  initialized: string;
  layoutReady: string;
  runtimeReady: string;
  exportWarning: string;
  currentFile: string;
  selectedPanel: string;
  none: string;
  disconnected: string;
  loadingModel: string;
  listSeparator: string;
  labelSeparator: string;
}

const productIntroWorkspaceDemoCopies: Record<WorkbenchLanguagePreference, ProductIntroWorkspaceDemoCopy> = {
  'zh-CN': {
    experimentFiles: '实验文件', edit: '编辑', window: '窗口', settings: '设置', help: '帮助',
    openFiles: '打开文件', hide: '隐藏', files: '文件', panels: '面板',
    noOpenFile: '当前没有打开的实验文件', noOpenFileHint: '在主工作区新建或打开实验。',
    noPanelHint: '打开实验后显示可用面板。', selectHint: '单击选中', openHint: '双击打开',
    noOpenTab: '没有打开的文件', noOpenStudy: '没有打开的研究', emptyTitle: '开始新的实验工作区',
    emptyBody: '创建标准模拟、理想气体关系研究或空气比热容比实验，以恢复预览、图表、结果和参数面板。',
    createIdeal: '创建理想气体模拟研究', createHeatCapacity: '创建空气热容比（绝热膨胀法）',
    createPiston: '创建空气热容比（活塞振动法）', createStandard: '创建标准模拟研究',
    openExperiment: '打开实验', noCachedExperiments: '没有可打开的缓存实验',
    fileName: 'Adiabatic Expansion - 001', fileKind: '热容', panelTreeTitle: 'ADIABATIC EXPANSION - 001 / PANELS',
    preview: '3D 预览', realtime: '实时数据', heatCapacityExperiment: '空气比热容比实验', materials: '实验资料与结果', guide: '实验指引',
    results: '数据与结果', review: '过程回顾', locked: '锁定', closed: '关闭',
    previewSubtitle: '实时分子视口', demoMode: '演示模式', guidedMode: '引导模式', freeMode: '自由模式',
    parameters: '当前参数', pressure: '压力', temperature: '温度', sensorSignal: '传感器信号',
    phase: '阶段', notPowered: '未开机', safe: '安全', currentPrompt: '当前提示', powerPrompt: '请先打开电源。',
    consoleOutput: '控制台 / 输出', logs: '日志', warnings: '警告', summary: '摘要', info: '信息', success: '成功',
    warning: '警告', initialized: 'Workbench 工作台原型已初始化。', layoutReady: '默认布局：3D 预览、实时数据 / 图表、当前参数。',
    runtimeReady: '标准模拟运行时、3D 预览和实时图表数据已连接。', exportWarning: '科学 PDF 导出需要桌面运行时桥接。',
    currentFile: '当前文件', selectedPanel: '选中板块', none: '无', disconnected: '未连接运行时', loadingModel: '正在载入三维装置', listSeparator: '、', labelSeparator: '：',
  },
  'zh-TW': {
    experimentFiles: '實驗檔案', edit: '編輯', window: '視窗', settings: '設定', help: '說明',
    openFiles: '開啟檔案', hide: '隱藏', files: '檔案', panels: '面板',
    noOpenFile: '目前沒有開啟的實驗檔案', noOpenFileHint: '在主工作區建立或開啟實驗。',
    noPanelHint: '開啟實驗後顯示可用面板。', selectHint: '按一下選取', openHint: '按兩下開啟',
    noOpenTab: '沒有開啟的檔案', noOpenStudy: '沒有開啟的研究', emptyTitle: '開始新的實驗工作區',
    emptyBody: '建立標準模擬、理想氣體關係研究或空氣比熱容比實驗，以恢復預覽、圖表、結果和參數面板。',
    createIdeal: '建立理想氣體模擬研究', createHeatCapacity: '建立空氣熱容比（絕熱膨脹法）',
    createPiston: '建立空氣熱容比（活塞振動法）', createStandard: '建立標準模擬研究',
    openExperiment: '開啟實驗', noCachedExperiments: '沒有可開啟的快取實驗',
    fileName: 'Adiabatic Expansion - 001', fileKind: '熱容', panelTreeTitle: 'ADIABATIC EXPANSION - 001 / PANELS',
    preview: '3D 預覽', realtime: '即時資料', heatCapacityExperiment: '空氣比熱容比實驗', materials: '實驗資料與結果', guide: '實驗指引',
    results: '資料與結果', review: '過程回顧', locked: '鎖定', closed: '關閉',
    previewSubtitle: '即時分子視口', demoMode: '示範模式', guidedMode: '引導模式', freeMode: '自由模式',
    parameters: '目前參數', pressure: '壓力', temperature: '溫度', sensorSignal: '感測器訊號',
    phase: '階段', notPowered: '未開機', safe: '安全', currentPrompt: '目前提示', powerPrompt: '請先開啟電源。',
    consoleOutput: '主控台 / 輸出', logs: '日誌', warnings: '警告', summary: '摘要', info: '資訊', success: '成功',
    warning: '警告', initialized: 'Workbench 工作台原型已初始化。', layoutReady: '預設配置：3D 預覽、即時資料 / 圖表、目前參數。',
    runtimeReady: '標準模擬執行階段、3D 預覽和即時圖表資料已連線。', exportWarning: '科學 PDF 匯出需要桌面執行階段橋接。',
    currentFile: '目前檔案', selectedPanel: '選取面板', none: '無', disconnected: '未連線執行階段', loadingModel: '正在載入三維裝置', listSeparator: '、', labelSeparator: '：',
  },
  en: {
    experimentFiles: 'Experiment Files', edit: 'Edit', window: 'Window', settings: 'Settings', help: 'Help',
    openFiles: 'Open Files', hide: 'Hide', files: 'Files', panels: 'Panels',
    noOpenFile: 'No experiment file is currently open', noOpenFileHint: 'Create or open an experiment in the workspace.',
    noPanelHint: 'Available panels appear after opening an experiment.', selectHint: 'Click to select', openHint: 'Double-click to open',
    noOpenTab: 'No open files', noOpenStudy: 'No open study', emptyTitle: 'Start a new experiment workspace',
    emptyBody: 'Create a standard simulation, ideal-gas study, or heat-capacity-ratio experiment to restore previews, charts, results, and parameters.',
    createIdeal: 'Create ideal-gas simulation study', createHeatCapacity: 'Create heat-capacity ratio (adiabatic)',
    createPiston: 'Create heat-capacity ratio (piston)', createStandard: 'Create standard simulation study',
    openExperiment: 'Open experiment', noCachedExperiments: 'No cached experiments available',
    fileName: 'Adiabatic Expansion - 001', fileKind: 'Heat', panelTreeTitle: 'ADIABATIC EXPANSION - 001 / PANELS',
    preview: '3D Preview', realtime: 'Realtime Data', heatCapacityExperiment: 'Air heat-capacity ratio experiment', materials: 'Experiment Materials & Results', guide: 'Experiment Guide',
    results: 'Data & Results', review: 'Process Review', locked: 'Locked', closed: 'Closed',
    previewSubtitle: 'Live molecular viewport', demoMode: 'Demo', guidedMode: 'Guided', freeMode: 'Free',
    parameters: 'Current Parameters', pressure: 'Pressure', temperature: 'Temperature', sensorSignal: 'Sensor signal',
    phase: 'Phase', notPowered: 'Power off', safe: 'Safe', currentPrompt: 'Current prompt', powerPrompt: 'Turn on the power first.',
    consoleOutput: 'Console / Output', logs: 'Logs', warnings: 'Warnings', summary: 'Summary', info: 'Info', success: 'Success',
    warning: 'Warning', initialized: 'Workbench prototype initialized.', layoutReady: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.',
    runtimeReady: 'Simulation runtime, 3D Preview, and realtime chart data connected.', exportWarning: 'Scientific PDF export requires the desktop runtime bridge.',
    currentFile: 'Current file', selectedPanel: 'Selected panel', none: 'None', disconnected: 'Runtime disconnected', loadingModel: 'Loading 3D instrument', listSeparator: ' · ', labelSeparator: ': ',
  },
};

const PRODUCT_INTRO_MODEL_ROTATION_START_MS = 1_650
  + PRODUCT_INTRO_WORKSPACE_POST_CLICK_DELAY_MS;
const PRODUCT_INTRO_MODEL_ROTATION_DURATION_MS = 3_600;
const PRODUCT_INTRO_MODEL_ROTATION_START_RAD = -0.38;
const PRODUCT_INTRO_MODEL_ROTATION_ARC_RAD = (60 * Math.PI) / 180;

const MenuItem = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <span className="first-run-workbench-demo-menu-item">
    {icon}
    <b>{label}</b>
    <ChevronDown size={7} strokeWidth={1.7} />
  </span>
);

interface RotatingInstrumentCloneProps {
  sourceScene: THREE.Object3D;
  rotationRad: number;
  onReady: () => void;
}

const RotatingInstrumentClone = ({
  sourceScene,
  rotationRad,
  onReady,
}: RotatingInstrumentCloneProps) => {
  const readyNotifiedRef = useRef(false);

  useEffect(() => {
    if (readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    onReady();
  }, [onReady]);

  return (
    <group
      name="product-intro-instrument-showcase"
      rotation={[0, rotationRad, 0]}
    >
      <Clone object={sourceScene} />
    </group>
  );
};

interface ProductIntroInstrumentPreviewProps {
  loadingLabel: string;
  rotationRad: number;
  onReady: () => void;
}

const ProductIntroInstrumentPreview = ({
  loadingLabel,
  rotationRad,
  onReady,
}: ProductIntroInstrumentPreviewProps) => (
  <div className="first-run-workbench-demo-model" aria-hidden="true">
    <Suspense fallback={<div className="first-run-workbench-demo-model-loading"><Gauge size={16} /><span>{loadingLabel}</span></div>}>
      <Canvas
        camera={{ position: [4.8, 3.2, 6.2], fov: 34 }}
        dpr={[1, 1.25]}
        frameloop="demand"
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={1.45} />
        <directionalLight position={[4, 7, 6]} intensity={2.35} />
        <directionalLight position={[-5, 3, -2]} intensity={1.05} />
        <Bounds fit clip observe margin={1.16}>
          <HeatCapacityUltraInstrumentAsset>
            {(sourceScene) => (
              <RotatingInstrumentClone
                sourceScene={sourceScene}
                rotationRad={rotationRad}
                onReady={onReady}
              />
            )}
          </HeatCapacityUltraInstrumentAsset>
        </Bounds>
      </Canvas>
    </Suspense>
  </div>
);

export const ProductIntroWorkspaceDemo = ({
  active,
  paused,
  reducedMotion,
  language,
  onComplete,
}: ProductIntroWorkspaceDemoProps) => {
  const copy = productIntroWorkspaceDemoCopies[language];
  const showFinalState = reducedMotion;
  const timelinePaused = paused || !active;
  const demoRef = useRef<HTMLDivElement | null>(null);
  const completionNotifiedRef = useRef(false);
  const timelineRemainingRef = useRef(PRODUCT_INTRO_WORKSPACE_DEMO_MS);
  const rotationStartDelayRemainingRef = useRef(PRODUCT_INTRO_MODEL_ROTATION_START_MS);
  const modelRotationProgressRef = useRef(0);
  const [timelineComplete, setTimelineComplete] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelShowcaseAllowed, setModelShowcaseAllowed] = useState(false);
  const [modelShowcaseComplete, setModelShowcaseComplete] = useState(false);
  const [modelRotationProgress, setModelRotationProgress] = useState(0);

  const finishDemo = useCallback(() => {
    if (completionNotifiedRef.current) return;
    completionNotifiedRef.current = true;
    onComplete();
  }, [onComplete]);
  const handleModelReady = useCallback(() => setModelReady(true), []);

  useLayoutEffect(() => {
    const demo = demoRef.current;
    if (!demo) return undefined;
    const updateCursorTravel = () => {
      demo.style.setProperty('--first-run-workbench-cursor-travel-x', `${demo.clientWidth * -0.12}px`);
      demo.style.setProperty('--first-run-workbench-cursor-travel-y', `${demo.clientHeight * -0.36}px`);
    };
    updateCursorTravel();
    const observer = new ResizeObserver(updateCursorTravel);
    observer.observe(demo);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !active ||
      paused ||
      reducedMotion ||
      modelShowcaseAllowed
    ) return undefined;

    const startedAt = performance.now();
    const timeoutId = window.setTimeout(() => {
      rotationStartDelayRemainingRef.current = 0;
      setModelShowcaseAllowed(true);
    }, rotationStartDelayRemainingRef.current);

    return () => {
      window.clearTimeout(timeoutId);
      rotationStartDelayRemainingRef.current = Math.max(
        0,
        rotationStartDelayRemainingRef.current - (performance.now() - startedAt),
      );
    };
  }, [active, modelShowcaseAllowed, paused, reducedMotion]);

  useEffect(() => {
    if (!active || paused || reducedMotion || timelineComplete) return undefined;

    const startedAt = performance.now();
    const timeoutId = window.setTimeout(() => {
      timelineRemainingRef.current = 0;
      setTimelineComplete(true);
    }, timelineRemainingRef.current);

    return () => {
      window.clearTimeout(timeoutId);
      timelineRemainingRef.current = Math.max(
        0,
        timelineRemainingRef.current - (performance.now() - startedAt),
      );
    };
  }, [active, paused, reducedMotion, timelineComplete]);

  useEffect(() => {
    if (
      !active ||
      paused ||
      reducedMotion ||
      !modelReady ||
      !modelShowcaseAllowed ||
      modelShowcaseComplete
    ) return undefined;

    const segmentStartedAt = performance.now();
    const segmentStartProgress = modelRotationProgressRef.current;
    const advanceRotation = () => {
      const nextProgress = Math.min(
        1,
        segmentStartProgress
          + (performance.now() - segmentStartedAt) / PRODUCT_INTRO_MODEL_ROTATION_DURATION_MS,
      );
      modelRotationProgressRef.current = nextProgress;
      setModelRotationProgress(nextProgress);

      if (nextProgress >= 1) {
        window.clearInterval(animationIntervalId);
        setModelShowcaseComplete(true);
      }
    };

    const animationIntervalId = window.setInterval(advanceRotation, 16);
    advanceRotation();
    return () => {
      const elapsedProgress = (performance.now() - segmentStartedAt)
        / PRODUCT_INTRO_MODEL_ROTATION_DURATION_MS;
      modelRotationProgressRef.current = Math.min(1, segmentStartProgress + elapsedProgress);
      window.clearInterval(animationIntervalId);
    };
  }, [
    active,
    modelReady,
    modelShowcaseAllowed,
    modelShowcaseComplete,
    paused,
    reducedMotion,
  ]);

  useEffect(() => {
    if (
      !active ||
      paused ||
      reducedMotion ||
      !timelineComplete
    ) return;
    finishDemo();
  }, [active, finishDemo, paused, reducedMotion, timelineComplete]);

  const easedModelRotationProgress = modelRotationProgress
    * modelRotationProgress
    * (3 - 2 * modelRotationProgress);
  const modelRotationRad = PRODUCT_INTRO_MODEL_ROTATION_START_RAD
    + PRODUCT_INTRO_MODEL_ROTATION_ARC_RAD * easedModelRotationProgress;

  return (
    <div
      ref={demoRef}
      className={`first-run-workbench-demo ${showFinalState ? 'first-run-workbench-demo-final' : 'first-run-workbench-demo-playing'}`}
      data-product-intro-workspace-demo="true"
      data-product-intro-demo-paused={timelinePaused ? 'true' : 'false'}
      data-product-intro-model-ready={modelReady ? 'true' : 'false'}
      data-product-intro-model-showcase-started={modelShowcaseAllowed ? 'true' : 'false'}
      data-product-intro-model-showcase-complete={modelShowcaseComplete ? 'true' : 'false'}
      data-product-intro-model-rotation-progress={modelRotationProgress.toFixed(3)}
      data-product-intro-timeline-complete={timelineComplete ? 'true' : 'false'}
      aria-hidden="true"
      style={{
        '--first-run-workbench-demo-duration': `${PRODUCT_INTRO_WORKSPACE_DEMO_MS}ms`,
        '--first-run-workbench-pointer-duration': `${PRODUCT_INTRO_WORKSPACE_POINTER_TIMELINE_MS}ms`,
        '--first-run-workbench-content-duration': `${PRODUCT_INTRO_WORKSPACE_BASE_DEMO_MS}ms`,
        '--first-run-workbench-content-delay': `${PRODUCT_INTRO_WORKSPACE_POST_CLICK_DELAY_MS}ms`,
        '--first-run-workbench-demo-play-state': timelinePaused ? 'paused' : 'running',
      } as React.CSSProperties}
    >
      <div className="first-run-workbench-demo-shell">
        <header className="first-run-workbench-demo-titlebar">
          <div className="first-run-workbench-demo-brand">
            <img src="favicon.png" alt="" />
            <span>{getWorkbenchAppBrandName(language)}</span>
          </div>
          <nav>
            <MenuItem icon={<FilePlus2 size={10} />} label={copy.experimentFiles} />
            <MenuItem icon={<Undo2 size={10} />} label={copy.edit} />
            <MenuItem icon={<Wrench size={10} />} label={copy.window} />
            <MenuItem icon={<Settings size={10} />} label={copy.settings} />
            <MenuItem icon={<BookOpenText size={10} />} label={copy.help} />
          </nav>
          <div className="first-run-workbench-demo-window-controls">
            <Minus size={9} /><Square size={8} /><X size={9} />
          </div>
        </header>

        <div className="first-run-workbench-demo-body">
          <aside className="first-run-workbench-demo-sidebar">
            <header><strong>{copy.openFiles}</strong><span>{copy.hide}</span></header>

            <div className="first-run-workbench-demo-sidebar-state first-run-workbench-demo-sidebar-empty">
              <section>
                <h4><FolderOpen size={9} />{copy.files}</h4>
                <div className="first-run-workbench-demo-sidebar-message">
                  <strong>{copy.noOpenFile}</strong><span>{copy.noOpenFileHint}</span>
                </div>
              </section>
              <section>
                <h4><Columns size={9} />{copy.panels}</h4>
                <div className="first-run-workbench-demo-sidebar-message"><span>{copy.noPanelHint}</span></div>
              </section>
            </div>

            <div className="first-run-workbench-demo-sidebar-state first-run-workbench-demo-sidebar-loaded">
              <section>
                <h4><FolderOpen size={9} />{copy.files}</h4>
                <div className="first-run-workbench-demo-tree-row first-run-workbench-demo-tree-row-active">
                  <Gauge size={9} /><span>{copy.fileName}</span><small>{copy.fileKind}</small>
                </div>
              </section>
              <section>
                <h4><PanelLeft size={9} />{copy.panelTreeTitle}</h4>
                <div className="first-run-workbench-demo-tree-row first-run-workbench-demo-tree-row-selected">
                  <Gauge size={9} /><span>{copy.preview}</span><small>{copy.locked}</small>
                </div>
                <div className="first-run-workbench-demo-tree-row"><Activity size={9} /><span>{copy.realtime}</span><small>{copy.locked}</small></div>
                <div className="first-run-workbench-demo-tree-row"><BookOpenText size={9} /><span>{copy.materials}</span><small>{copy.closed}</small></div>
                <div className="first-run-workbench-demo-tree-row first-run-workbench-demo-tree-row-child"><FileText size={8} /><span>{copy.guide}</span></div>
                <div className="first-run-workbench-demo-tree-row first-run-workbench-demo-tree-row-child"><Database size={8} /><span>{copy.results}</span></div>
                <div className="first-run-workbench-demo-tree-row first-run-workbench-demo-tree-row-child"><Archive size={8} /><span>{copy.review}</span></div>
              </section>
            </div>

            <footer><span>{copy.selectHint}</span><span>{copy.openHint}</span></footer>
          </aside>

          <main className="first-run-workbench-demo-main">
            <div className="first-run-workbench-demo-tabs">
              <span className="first-run-workbench-demo-tab-empty">{copy.noOpenTab}</span>
              <span className="first-run-workbench-demo-tab-loaded"><Gauge size={9} />{copy.fileName}<small>{copy.fileKind}</small><X size={8} /></span>
            </div>

            <section className="first-run-workbench-demo-empty-state">
              <div>
                <span>{copy.noOpenStudy}</span>
                <h3>{copy.emptyTitle}</h3>
                <p>{copy.emptyBody}</p>
                <div className="first-run-workbench-demo-empty-actions">
                  <button type="button" tabIndex={-1}><FlaskConical size={10} />{copy.createIdeal}</button>
                  <button type="button" tabIndex={-1} className="first-run-workbench-demo-target"><Gauge size={10} />{copy.createHeatCapacity}</button>
                  <button type="button" tabIndex={-1}><Gauge size={10} />{copy.createPiston}</button>
                  <button type="button" tabIndex={-1}><Activity size={10} />{copy.createStandard}</button>
                </div>
                <div className="first-run-workbench-demo-open-actions">
                  <strong><FolderOpen size={9} />{copy.openExperiment}</strong>
                  <button type="button" tabIndex={-1} disabled><Archive size={10} />{copy.noCachedExperiments}</button>
                </div>
              </div>
            </section>

            <section className="first-run-workbench-demo-loaded-state">
              <article className="first-run-workbench-demo-panel first-run-workbench-demo-preview-panel">
                <header>
                  <span><strong>{copy.preview}</strong><small>{copy.previewSubtitle}</small></span>
                  <div className="first-run-workbench-demo-mode-buttons">
                    <b>{copy.demoMode}</b><b>{copy.guidedMode}</b><b>{copy.freeMode}</b><Wrench size={10} />
                  </div>
                </header>
                <ProductIntroInstrumentPreview
                  loadingLabel={copy.loadingModel}
                  rotationRad={modelRotationRad}
                  onReady={handleModelReady}
                />
              </article>
              <i className="first-run-workbench-demo-divider" />
              <article className="first-run-workbench-demo-panel first-run-workbench-demo-data-panel">
                <header><span><strong>{copy.realtime}</strong><small>U<sub>T</sub> / U<sub>P</sub>{copy.listSeparator}{copy.pressure}</small></span></header>
                <div className="first-run-workbench-demo-data-summary">
                  <span>{copy.realtime}</span><strong>{copy.heatCapacityExperiment}</strong><small>U<sub>T</sub> / U<sub>P</sub> · {copy.pressure}</small>
                  <div><b>{copy.phase}{copy.labelSeparator}{copy.notPowered}</b><b>{copy.fileKind}</b></div>
                </div>
                <div className="first-run-workbench-demo-reading-grid">
                  <div><span>U<sub>T</sub> / mV</span><strong>-- . -</strong><small>{copy.temperature}</small></div>
                  <div><span>U<sub>P</sub> / mV</span><strong>-- . -</strong><small>{copy.sensorSignal}</small></div>
                  <div><span>ΔP / kPa</span><strong>--</strong><small>{copy.pressure}</small></div>
                  <div><span>{copy.pressure}</span><strong className="first-run-workbench-demo-safe">{copy.safe}</strong><small>{copy.notPowered}</small></div>
                </div>
                <div className="first-run-workbench-demo-current-prompt"><span>{copy.currentPrompt}</span>{copy.powerPrompt}</div>
              </article>
              <aside className="first-run-workbench-demo-parameters"><SlidersHorizontal size={9} /><span>{copy.parameters}</span></aside>
            </section>
          </main>
        </div>

        <section className="first-run-workbench-demo-console">
          <header><ChevronDown size={9} /><strong>{copy.consoleOutput}</strong><div><b>{copy.logs}</b><b>{copy.warnings}</b><b>{copy.summary}</b></div></header>
          <div className="first-run-workbench-demo-console-lines">
            <span><time>07:21:14</time><i>{copy.info}</i><b>{copy.initialized}</b></span>
            <span><time>07:21:14</time><i>{copy.success}</i><b>{copy.layoutReady}</b></span>
            <span><time>07:21:14</time><i>{copy.success}</i><b>{copy.runtimeReady}</b></span>
            <span><time>07:21:14</time><i>{copy.warning}</i><b>{copy.exportWarning}</b></span>
          </div>
        </section>

        <footer className="first-run-workbench-demo-status">
          <div>
            <span className="first-run-workbench-demo-status-empty">{copy.currentFile}{copy.labelSeparator}{copy.none}</span>
            <span className="first-run-workbench-demo-status-loaded">{copy.currentFile}{copy.labelSeparator}{copy.fileName}</span>
            <span className="first-run-workbench-demo-status-empty">{copy.selectedPanel}{copy.labelSeparator}{copy.none}</span>
            <span className="first-run-workbench-demo-status-loaded">{copy.selectedPanel}{copy.labelSeparator}{copy.preview}</span>
          </div>
          <span>{copy.disconnected}</span>
        </footer>
      </div>

      {!showFinalState ? (
        <div className="first-run-workbench-demo-cursor">
          <span className="first-run-workbench-demo-click-ring" />
          <MousePointer2 size={19} strokeWidth={1.7} fill="currentColor" />
        </div>
      ) : null}
    </div>
  );
};
