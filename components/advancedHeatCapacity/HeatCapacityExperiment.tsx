import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  applyHeatCapacityAction,
  getHeatCapacityInteractionDescriptor,
  getHeatCapacityInstrumentDisplayState,
  getHeatCapacityParticleVisualState,
  HARD_SPHERE_GAMMA,
  resolveHeatCapacityPartAction,
  type HeatCapacityAction,
  type HeatCapacityInteractionDescriptor,
  type HeatCapacityInstrumentPartId,
  type HeatCapacityState,
} from '../../utils/heatCapacityExperiment.ts';
import InstrumentProceduralModel from './InstrumentProceduralModel.tsx';

interface HeatCapacityExperimentProps {
  state: HeatCapacityState;
  onAction: (action: HeatCapacityAction) => void;
  demoStatus?: 'idle' | 'prompt' | 'running' | 'paused' | 'completed';
  demoMessage?: string;
  demoCompletedOnce?: boolean;
}

const formatMetric = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const phaseLabels: Record<HeatCapacityState['phase'], string> = {
  equalizing: '\u73af\u5883\u5e73\u8861',
  pumping: '\u6cf5\u6c14\u52a0\u538b',
  stabilizingP1: '\u7a33\u5b9a p1',
  recordP1: '\u8bb0\u5f55 p1',
  releasing: '\u5feb\u901f\u653e\u6c14',
  recovering: '\u70ed\u6062\u590d',
  recordP2: '\u8bb0\u5f55 p2',
  completed: '\u5df2\u5b8c\u6210',
};

const ActionButton: React.FC<{
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}> = ({ children, disabled, title, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    onClick={onClick}
    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
  >
    {children}
  </button>
);

const actionAnimationMs = (action: HeatCapacityAction) => {
  switch (action.type) {
    case 'toggleInstrumentPower':
    case 'setInstrumentPower':
      return 450;
    case 'pump':
      return 1100;
    case 'release':
      return 1200;
    case 'stabilizeP1':
    case 'recover':
      return 1500;
    case 'recordP0':
    case 'recordP1':
    case 'recordP2':
      return 650;
    default:
      return 0;
  }
};

const actionAnimationMessage = (action: HeatCapacityAction) => {
  switch (action.type) {
    case 'toggleInstrumentPower':
    case 'setInstrumentPower':
      return '\u4eea\u8868\u7535\u6e90\u62e8\u6746\u5207\u6362\u4e2d\u3002';
    case 'pump':
      return '\u6253\u6c14\u62e8\u6746\u52a8\u4f5c\u4e2d\uff0c\u8bfb\u6570\u6b63\u5728\u4e0a\u5347\u5e76\u8d8b\u4e8e\u7a33\u5b9a\u3002';
    case 'release':
      return '\u653e\u6c14\u8fc7\u7a0b\u4e2d\uff0c\u538b\u5f3a\u8bfb\u6570\u6b63\u5728\u5feb\u901f\u56de\u843d\u3002';
    case 'stabilizeP1':
    case 'recover':
      return '\u8bfb\u6570\u7a33\u5b9a\u4e2d\uff0c\u8bf7\u7b49\u5f85\u4eea\u8868\u63a5\u8fd1\u7a33\u5b9a\u503c\u3002';
    case 'recordP0':
    case 'recordP1':
    case 'recordP2':
      return '\u8bb0\u5f55\u5b8c\u6210\uff0c\u4eea\u8868\u8bfb\u6570\u77ed\u6682\u4fdd\u6301\u3002';
    default:
      return '';
  }
};

const buildPartHints = (
  descriptor: HeatCapacityInteractionDescriptor,
): Partial<Record<HeatCapacityInstrumentPartId, string>> => ({
  Hit_C1: 'C1 是进气阀，由实验流程自动控制。',
  Hit_C2: descriptor.primaryPart === 'Hit_C2'
    ? descriptor.instruction
    : 'C2 是快速放气阀，记录 p1 后才是当前操作。',
  Hit_Pump: descriptor.validParts.includes('Hit_Pump')
    ? '点击打气拨杆，向方形压力瓶内加入硬球气体。'
    : '打气不是当前步骤的操作。',
  Hit_Pressure_Gauge: descriptor.primaryPart === 'Hit_Pressure_Gauge'
    ? descriptor.instruction
    : '需要记录 p0、p1 或 p2 时，在这里读取压强。',
  Hit_Temperature_Display: descriptor.primaryPart === 'Hit_Temperature_Display'
    ? descriptor.instruction
    : '需要确认热稳定或热恢复时，使用温度显示。',
  Hit_Instrument_Box: '仪表箱只读显示传感器数据，不推进实验步骤。',
  Instrument_Box: '仪表箱只读显示传感器数据，不推进实验步骤。',
  Instrument_Box_Display: '仪表箱屏幕同步显示压强、温度、记录值和 gamma。',
  Instrument_Box_Temp_Display: '左侧数码屏显示温度传感器读数。',
  Instrument_Box_Pressure_Display: '中间数码屏显示压强传感器读数。',
  Instrument_Box_Analog_Gauge: '指针式压强表跟随压强变化。',
  Instrument_Box_Power_Switch: '电源拨杆控制仪表读数和实验操作权限。',
  Instrument_Box_Pump_Check_Switch: '打气拨杆映射到同一个泵气操作。',
  Instrument_Box_Pump_Control: '打气拨杆映射到同一个泵气操作。',
  Glass_Outer_Shell: '外层玻璃罩用于接近真实装置外观。',
  Sealing_Stopper: '密封塞表现压力腔顶部密封结构。',
  Top_Glass_Tube: '顶部玻璃管表现真实仪器气路。',
  Valve_Manifold: '顶部阀组表现 C1/C2 的气路连接。',
  Pressure_Sensor: '压力传感器读取方形压力瓶内压强。',
  Temperature_Sensor: '温度探针读取硬球气体温度。',
  Sensor_Cable_Pressure: '压力传感器线缆连接到外部仪表箱。',
  Sensor_Cable_Temperature: '温度传感器线缆连接到外部仪表箱。',
});

const HeatCapacityExperiment: React.FC<HeatCapacityExperimentProps> = ({
  state,
  onAction,
  demoStatus = 'idle',
  demoMessage,
  demoCompletedOnce = false,
}) => {
  const descriptor = getHeatCapacityInteractionDescriptor(state);
  const particleVisualState = getHeatCapacityParticleVisualState(state);
  const displayState = getHeatCapacityInstrumentDisplayState(state);
  const partHints = buildPartHints(descriptor);
  const [interactionMessage, setInteractionMessage] = React.useState(descriptor.instruction);
  const [operationLockMessage, setOperationLockMessage] = React.useState('');
  const operationLockTimer = React.useRef<number | null>(null);
  const canUsePart = (partId: HeatCapacityInstrumentPartId) => descriptor.validParts.includes(partId);
  const demoLocksManualControls = demoStatus === 'running';
  const operationLocksManualControls = Boolean(operationLockMessage);
  const controlsLocked = demoLocksManualControls || operationLocksManualControls;
  const visibleDemoMessage = demoMessage || (
    demoStatus === 'prompt'
      ? '\u70b9\u51fb\u9876\u90e8\u5f00\u59cb\u6309\u94ae\u89c2\u770b\u5b8c\u6574\u6559\u5b66\u6f14\u793a\u3002'
      : demoCompletedOnce
        ? '\u6559\u5b66\u6f14\u793a\u5df2\u5b8c\u6210\u3002\u65b0\u5efa\u70ed\u5bb9\u6bd4\u5b9e\u9a8c\u53ef\u91cd\u65b0\u89c2\u770b\u3002'
        : ''
  );

  React.useEffect(() => {
    setInteractionMessage(descriptor.instruction);
  }, [descriptor.instruction]);

  React.useEffect(() => () => {
    if (operationLockTimer.current !== null) window.clearTimeout(operationLockTimer.current);
  }, []);

  const runGuidedAction = (action: HeatCapacityAction) => {
    const lockMs = actionAnimationMs(action);
    const lockMessage = actionAnimationMessage(action);
    onAction(action);
    if (lockMs <= 0 || !lockMessage) return;
    if (operationLockTimer.current !== null) window.clearTimeout(operationLockTimer.current);
    setInteractionMessage(lockMessage);
    setOperationLockMessage(lockMessage);
    operationLockTimer.current = window.setTimeout(() => {
      setOperationLockMessage('');
      operationLockTimer.current = null;
    }, lockMs);
  };

  const handlePartActivate = (partId: HeatCapacityInstrumentPartId) => {
    if (demoLocksManualControls) {
      setInteractionMessage('\u6559\u5b66\u6f14\u793a\u8fdb\u884c\u4e2d\uff0c\u624b\u52a8\u64cd\u4f5c\u6682\u65f6\u9501\u5b9a\u3002');
      return;
    }
    if (operationLocksManualControls) {
      setInteractionMessage(operationLockMessage);
      return;
    }
    const resolution = resolveHeatCapacityPartAction(state, partId);
    setInteractionMessage(resolution.message);
    if (resolution.action) runGuidedAction(resolution.action);
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-2 text-slate-700">
      <div className="hidden">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            纭悆姣旂儹瀹规瘮瀹為獙
          </div>
          <h2 className="mt-1 text-base font-bold text-slate-900">鍗曞師瀛愮‖鐞冩皵浣擄紝gamma = 5/3</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{descriptor.instruction}</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{descriptor.purpose}</p>
          {visibleDemoMessage && demoStatus !== 'completed' && (
            <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
              {visibleDemoMessage}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">阶段</div>
            <div className="font-semibold text-slate-900">{phaseLabels[state.phase]}</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">压强</div>
            <div className="font-semibold text-slate-900">{formatMetric(state.pressure)} kPa</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">温度</div>
            <div className="font-semibold text-slate-900">{formatMetric(state.temperature, 3)}</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">理论值</div>
            <div className="font-semibold text-slate-900">{HARD_SPHERE_GAMMA.toFixed(3)}</div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(430px,1fr)_auto] gap-2">
        <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
          <Canvas camera={{ position: [9.6, 5.9, 11.2], fov: 48 }} dpr={[1, 1.5]}>
            <color attach="background" args={['#0f172a']} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[5, 7, 4]} intensity={1.25} />
            <InstrumentProceduralModel
              state={state.instrument}
              particleCount={state.particleCount}
              vesselLength={state.vesselLength}
              particleVisualState={particleVisualState}
              displayState={displayState}
              interactionHints={partHints}
              onPartActivate={handlePartActivate}
            />
            <OrbitControls enableDamping makeDefault target={[0.8, 0.05, 0.78]} />
          </Canvas>
          {!visibleDemoMessage && (
            <div className="pointer-events-none absolute left-3 top-3 max-w-[430px] rounded-md border border-sky-300/50 bg-slate-950/72 px-3 py-2 text-xs font-semibold leading-5 text-sky-50 shadow-lg backdrop-blur">
              {descriptor.instruction}
            </div>
          )}
          {visibleDemoMessage && demoStatus !== 'idle' && (
            <div className="studio-heat-demo-callout pointer-events-none absolute left-3 top-3 max-w-[360px] rounded-lg border border-emerald-300/80 bg-slate-950/88 px-3 py-2 text-xs font-semibold leading-5 text-emerald-50 shadow-lg shadow-emerald-950/30 backdrop-blur">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-emerald-300">
                {demoStatus === 'running' ? '演示进行中' : demoStatus === 'paused' ? '演示已暂停' : '教学提示'}
              </div>
              {visibleDemoMessage}
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-sm lg:grid-cols-[minmax(280px,1fr)_minmax(260px,0.85fr)]">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">引导操作</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              3D 模型点击和这些备用按钮会驱动同一套实验状态。
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
              <ActionButton
                disabled={controlsLocked}
                title={partHints.Instrument_Box_Power_Switch}
                onClick={() => runGuidedAction({ type: 'toggleInstrumentPower' })}
              >
                {state.instrument.instrumentPowered ? '关闭电源' : '打开电源'}
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || state.phase !== 'equalizing' || !canUsePart('Hit_Pressure_Gauge')}
                title={partHints.Hit_Pressure_Gauge}
                onClick={() => runGuidedAction({ type: 'recordP0' })}
              >
                记录 p0
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || !canUsePart('Hit_Pump')}
                title={partHints.Hit_Pump}
                onClick={() => runGuidedAction({ type: 'pump', strokes: 2 })}
              >
                泵气
              </ActionButton>
              <ActionButton
                disabled={
                  controlsLocked ||
                  !canUsePart('Hit_Temperature_Display') ||
                  (state.phase !== 'pumping' && state.phase !== 'stabilizingP1')
                }
                title={partHints.Hit_Temperature_Display}
                onClick={() => runGuidedAction({ type: 'stabilizeP1' })}
              >
                稳定 p1
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || state.phase !== 'recordP1' || !canUsePart('Hit_Pressure_Gauge')}
                title={partHints.Hit_Pressure_Gauge}
                onClick={() => runGuidedAction({ type: 'recordP1' })}
              >
                记录 p1
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || !canUsePart('Hit_C2')}
                title={partHints.Hit_C2}
                onClick={() => runGuidedAction({ type: 'release', durationMs: 420, closeDelayMs: 0 })}
              >
                快速放气
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || state.phase !== 'recovering' || !canUsePart('Hit_Temperature_Display')}
                title={partHints.Hit_Temperature_Display}
                onClick={() => runGuidedAction({ type: 'recover' })}
              >
                热恢复
              </ActionButton>
              <ActionButton
                disabled={controlsLocked || state.phase !== 'recordP2' || !canUsePart('Hit_Pressure_Gauge')}
                title={partHints.Hit_Pressure_Gauge}
                onClick={() => runGuidedAction({ type: 'recordP2' })}
              >
                记录 p2
              </ActionButton>
              <ActionButton onClick={() => onAction({ type: 'reset' })}>重置</ActionButton>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <span className="text-slate-500">p0</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p0)} kPa</span>
              <span className="text-slate-500">p1</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p1)} kPa</span>
              <span className="text-slate-500">p2</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p2)} kPa</span>
              <span className="text-slate-500">gamma</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.result?.gamma, 3)}</span>
              <span className="text-slate-500">相对误差</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.result?.relativeErrorPercent, 2)}%</span>
            </div>
          </div>
          {state.lastError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800">
              {state.lastError}
            </div>
          )}
          {!state.lastError && interactionMessage && (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs font-medium text-sky-800">
              {interactionMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const reduceHeatCapacityExperiment = applyHeatCapacityAction;

export default HeatCapacityExperiment;
