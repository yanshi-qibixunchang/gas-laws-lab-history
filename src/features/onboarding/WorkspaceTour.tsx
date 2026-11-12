import { useId, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { WORKSPACE_TOUR_FILE_STEPS, type WorkspaceTourFileStep, type WorkspaceTourStep } from './workspaceTourModel.ts';
import './WorkspaceTour.css';

type TourStep = WorkspaceTourFileStep | 'create';
type Side = 'above' | 'below' | 'left' | 'right';
type Placement = { x: number; y: number; arrow: number; side: Side };

const COPY = {
  'zh-CN': {
    previous: '上一步', next: '明白了', complete: '完成', close: '退出界面导览',
    top: ['顶部菜单', '欢迎来到气律实验室。你可以从「实验文件」新建或打开实验，也可以用「窗口」菜单显示或隐藏工作台里的面板。'],
    files: ['左侧文件与面板', '左侧列出了已打开的实验文件，以及当前文件可用的面板。单击选中一项，双击面板名称打开对应内容。'],
    workspace: ['中部实验工作区', '这里是做实验的地方。你可以在「3D 预览」里操作仪器，在「实时数据」里查看压强读数和记录的曲线。工作区右上方的按钮用于切换实验模式。'],
    modes: ['实验模式', '「演示」会自动展示实验流程。「引导」会提示下一步，由你动手完成。「自由」让你自己设置参数，独立完成实验。新手按「演示 → 引导 → 自由」的顺序逐步解锁。'],
    console: ['底部控制台', '这里会显示操作记录和软件提示。想确认刚才的操作是否成功，可以看「日志」。如果遇到问题，可以切到「警告」查看提示。'],
    parameters: ['右侧当前参数', '现在已进入自由模式。你可以在这里查看和调整气体类型、环境压强、采样频率等实验参数。把鼠标移到参数旁的「？」上，就能看到它的用途。'],
    create: ['创建你的第一个实验', '点击框内你感兴趣的实验，创建你的第一个实验文件。'],
  },
  'zh-TW': {
    previous: '上一步', next: '明白了', complete: '完成', close: '退出介面導覽',
    top: ['頂部選單', '歡迎來到氣律實驗室。你可以從「實驗檔案」建立或開啟實驗，也可以用「視窗」選單顯示或隱藏工作台裡的面板。'],
    files: ['左側檔案與面板', '左側列出已開啟的實驗檔案，以及目前檔案可用的面板。按一下可選取項目，按兩下面板名稱可開啟對應內容。'],
    workspace: ['中央實驗工作區', '這裡是做實驗的地方。你可以在「3D 預覽」操作儀器，在「即時資料」查看壓強讀值和記錄的曲線。工作區右上方的按鈕用於切換實驗模式。'],
    modes: ['實驗模式', '「演示」會自動展示實驗流程。「引導」會提示下一步，由你動手完成。「自由」讓你自己設定參數，獨立完成實驗。新手依「演示 → 引導 → 自由」的順序逐步解鎖。'],
    console: ['底部控制台', '這裡會顯示操作記錄和軟體提示。想確認剛才的操作是否成功，可以查看「日誌」。如果遇到問題，可以切換到「警告」查看提示。'],
    parameters: ['右側目前參數', '現在已進入自由模式。你可以在這裡查看和調整氣體類型、環境壓強、取樣頻率等實驗參數。將滑鼠移到參數旁的「？」上，就能看到它的用途。'],
    create: ['建立你的第一個實驗', '按一下框內你感興趣的實驗，建立你的第一個實驗檔案。'],
  },
  en: {
    previous: 'Back', next: 'Got it', complete: 'Finish', close: 'Exit the workspace tour',
    top: ['Top menu', 'Welcome to Gas Laws Lab. Use Experiment Files to create or open an experiment, and Window to show or hide workbench panels.'],
    files: ['Files and panels', 'The left sidebar lists open experiments and the panels available for the current file. Click to select an item. Double-click a panel name to open it.'],
    workspace: ['Experiment workspace', 'Operate the apparatus in 3D Preview, then view pressure readings and recorded curves in Realtime Data. The buttons at the upper right switch experiment modes.'],
    modes: ['Experiment modes', 'Demo shows the experiment automatically. Guide prompts you through each step. Free lets you set the parameters and run the experiment yourself. New learners unlock Demo, Guide, and Free in that order.'],
    console: ['Console', 'The console records actions and messages. Check Logs to see what happened, or open Warnings if you encounter a problem.'],
    parameters: ['Current Parameters', 'You are now in Free mode. Review or change settings such as gas type, ambient pressure, and sample rate here. Hover over a question mark to learn what a setting does.'],
    create: ['Create your first experiment', 'Select an experiment in the highlighted area to create your first file.'],
  },
} as const;

const anchors: Record<TourStep, { selector: string; side: Side }> = {
  top: { selector: '.studio-top-commands', side: 'below' },
  files: { selector: '.studio-sidebar .studio-panel-header', side: 'right' },
  workspace: { selector: '.studio-live-workspace .studio-dock-header', side: 'below' },
  modes: { selector: '[data-piston-oscillation-mode-control]', side: 'below' },
  console: { selector: '.studio-console-header .studio-console-tabs', side: 'above' },
  parameters: { selector: '.studio-current-params-header', side: 'left' },
  create: { selector: '.studio-empty-actions', side: 'right' },
};

const opposite: Record<Side, Side> = {
  above: 'below', below: 'above', left: 'right', right: 'left',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(min, max), Math.max(min, value));

const placeBubble = (host: HTMLElement, anchor: HTMLElement, bubble: HTMLElement, preferred: Side): Placement => {
  const bounds = host.getBoundingClientRect();
  const target = anchor.getBoundingClientRect();
  const width = host.clientWidth;
  const height = host.clientHeight;
  const sx = width / bounds.width;
  const sy = height / bounds.height;
  const left = (target.left - bounds.left) * sx;
  const right = (target.right - bounds.left) * sx;
  const top = (target.top - bounds.top) * sy;
  const bottom = (target.bottom - bounds.top) * sy;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  const edge = 12;
  const gap = 12;
  const free = { above: top, below: height - bottom, left, right: width - right };
  const fits = (side: Side) => free[side] >= (side === 'left' || side === 'right' ? w : h) + gap + edge;
  const candidates: Side[] = [preferred, opposite[preferred], 'above', 'below', 'left', 'right'];
  const side = candidates.find(fits) ?? preferred;
  const x = clamp(side === 'left' ? left - w - gap : side === 'right' ? right + gap : centerX - w / 2, edge, width - w - edge);
  const y = clamp(side === 'above' ? top - h - gap : side === 'below' ? bottom + gap : centerY - h / 2, edge, height - h - edge);
  const arrow = side === 'above' || side === 'below'
    ? clamp(centerX - x, 18, w - 18)
    : clamp(centerY - y, 18, h - 18);
  return { x, y, side, arrow };
};

export const WorkspaceTour = ({ step, language, onStep }: {
  step: TourStep;
  language: WorkbenchLanguagePreference;
  onStep: (step: WorkspaceTourStep) => void;
}) => {
  const copy = COPY[language];
  const [title, body] = copy[step];
  const headingId = useId();
  const bodyId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const index = step === 'create' ? -1 : WORKSPACE_TOUR_FILE_STEPS.indexOf(step);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const bubble = bubbleRef.current;
    const root = overlay?.closest('.studio-workbench');
    if (!overlay || !bubble || !root) return undefined;
    const { selector, side } = anchors[step];
    const anchor = root.querySelector<HTMLElement>(selector);
    if (!anchor) return undefined;
    let frame = 0;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (overlay.clientWidth && overlay.clientHeight && anchor.getBoundingClientRect().width > 0) {
          setPlacement(placeBubble(overlay, anchor, bubble, side));
        }
      });
    };
    const sidebar = step === 'parameters' ? anchor.closest('.studio-current-params') : null;
    const animations = sidebar?.getAnimations() ?? [];
    const observer = new ResizeObserver(update);
    const start = () => {
      if (disposed) return;
      observer.observe(overlay);
      observer.observe(bubble);
      observer.observe(anchor);
      window.addEventListener('resize', update);
      update();
    };
    if (animations.length > 0) {
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(start);
    } else {
      start();
    }
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', update);
      cancelAnimationFrame(frame);
    };
  }, [step]);

  const visible = placement !== null;
  useLayoutEffect(() => {
    if (visible) nextRef.current?.focus({ preventScroll: true });
  }, [visible]);

  return (
    <div className="workspace-tour-layer" ref={overlayRef}>
      <section
        ref={bubbleRef}
        className="workspace-tour-bubble"
        data-workspace-tour-step={step}
        data-workspace-tour-side={placement?.side}
        role="dialog"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        onKeyDown={(event) => event.stopPropagation()}
        onKeyUp={(event) => event.stopPropagation()}
        style={{
          visibility: visible ? 'visible' : 'hidden',
          left: placement?.x,
          top: placement?.y,
        }}
      >
        <span
          className="workspace-tour-arrow"
          aria-hidden="true"
          style={placement?.side === 'left' || placement?.side === 'right'
            ? { top: placement.arrow }
            : { left: placement?.arrow }}
        />
        <h2 id={headingId}>{title}</h2>
        <button
          className="workspace-tour-close"
          type="button"
          aria-label={copy.close}
          onClick={() => onStep(step === 'create' ? 'finished' : 'skipped')}
        >
          <X size={18} />
        </button>
        <p id={bodyId}>{body}</p>
        <div className="workspace-tour-actions">
          {step !== 'create' ? (
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => onStep(WORKSPACE_TOUR_FILE_STEPS[index - 1])}
            >
              {copy.previous}
            </button>
          ) : null}
          <button
            ref={nextRef}
            className="workspace-tour-next"
            type="button"
            onClick={() => onStep(step === 'create' ? 'finished' : WORKSPACE_TOUR_FILE_STEPS[index + 1] ?? 'create')}
          >
            {step === 'parameters' ? copy.complete : copy.next}
          </button>
        </div>
      </section>
    </div>
  );
};
