import React, { memo } from 'react';
import type { HeatCapacityRealtimeSnapshot, HeatCapacityRuntimeController } from './heatCapacityRuntimeStore.ts';
import type { HeatCapacityRealtimeLanguage } from './HeatCapacityTraceChart.tsx';

interface HeatCapacityRealtimePanelProps {
  autoDemoInteractionLocked: boolean;
  autoDemoPaused: boolean;
  autoDemoRunning: boolean;
  controller: HeatCapacityRuntimeController | null;
  language: HeatCapacityRealtimeLanguage;
  snapshot: HeatCapacityRealtimeSnapshot | null;
}

interface HeatCapacityRealtimePanelConnectedProps {
  autoDemoInteractionLocked: boolean;
  autoDemoPaused: boolean;
  autoDemoRunning: boolean;
  controller: HeatCapacityRuntimeController | null;
  language: HeatCapacityRealtimeLanguage;
}

const subscribeToNoopStore = () => () => undefined;
const getNullHeatCapacityRealtimeSnapshot = (): HeatCapacityRealtimeSnapshot | null => null;

const formatMetric = (value: number, digits = 3) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const renderScientificText = (text: string): React.ReactNode => {
  const parts = text.split(/(U_T|U_p|U_P)/g);
  return parts.map((part, index) => {
    if (part === 'U_T') return <React.Fragment key={`${part}-${index}`}>U<sub>T</sub></React.Fragment>;
    if (part === 'U_p' || part === 'U_P') return <React.Fragment key={`${part}-${index}`}>U<sub>p</sub></React.Fragment>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const getHeatCapacityPhaseLabel = (phase: HeatCapacityRuntimePhase) => {
  if (phase === 'powerOff') return '未开机';
  if (phase === 'readyToZero') return '等待调零';
  if (phase === 'zeroed') return '已调零';
  if (phase === 'readyToPump') return '准备打气';
  if (phase === 'pumping') return '打气中';
  if (phase === 'sealedStabilizing') return '封闭等待稳定';
  if (phase === 'releasing') return '快速放气';
  if (phase === 'recovering') return '等待回温';
  if (phase === 'demoComplete') return '演示结束';
  return '实验准备';
};

const getHeatCapacityCurrentHint = (snapshot: HeatCapacityRealtimeSnapshot) => {
  if (snapshot.heatCapacityPhase === 'demoComplete') return '自动演示已结束，可重新开始或查看后续数据处理结果。';
  if (!snapshot.powerOn || snapshot.heatCapacityPhase === 'powerOff') return '请先打开电源。';
  if (snapshot.heatCapacityPhase === 'readyToZero') return '请观察 U_p，并进行压强调零。';
  if (snapshot.heatCapacityPhase === 'zeroed' || snapshot.heatCapacityPhase === 'readyToPump') return '请关闭玻璃旋塞并准备打气。';
  if (snapshot.heatCapacityPhase === 'pumping') return '保持合适打气频率，并注意压力表安全范围。';
  if (snapshot.heatCapacityPhase === 'sealedStabilizing') return '等待 U_p 和 U_T 小范围波动后进入放气步骤。';
  if (snapshot.heatCapacityPhase === 'releasing') return '关闭玻璃旋塞，并等待回温稳定。';
  if (snapshot.heatCapacityPhase === 'recovering') return '等待 U_T 回稳后记录 U2。';
  return snapshot.pumpHint || '观察实时读数和曲线变化。';
};

export const HeatCapacityRealtimePanel = memo(({
  autoDemoInteractionLocked,
  autoDemoPaused,
  autoDemoRunning,
  controller,
  language,
  snapshot,
}: HeatCapacityRealtimePanelProps) => {
  if (!snapshot) return null;

  const phaseLabel = getHeatCapacityPhaseLabel(snapshot.heatCapacityPhase);
  const stopcockStateLabel = snapshot.stopcockOpen ? '打开' : '关闭';
  const heatCapacityHeaderBadges = [
    {
      key: 'stage',
      label: `阶段：${phaseLabel}`,
      className: 'studio-heat-status-badge-stage',
    },
    ...(autoDemoRunning || autoDemoPaused || autoDemoInteractionLocked
      ? [{
          key: 'demo',
          label: autoDemoPaused ? '自动演示暂停' : autoDemoRunning ? '自动演示' : '自动演示准备',
          className: 'studio-heat-status-badge-mode',
        }]
      : []),
    ...(autoDemoInteractionLocked
      ? [{
          key: 'lock',
          label: '操作锁定',
          className: 'studio-heat-status-badge-warning',
        }]
      : []),
  ];
  const temperatureSignalValue = snapshot.powerOn && typeof snapshot.temperatureSignalMv === 'number'
    ? formatMetric(snapshot.temperatureSignalMv, 1)
    : '--.-';
  const pressureSignalValue = snapshot.powerOn && typeof snapshot.pressureSignalMv === 'number'
    ? formatMetric(snapshot.pressureSignalMv, 1)
    : '--.-';
  const currentDeltaPKPa = snapshot.powerOn &&
    typeof snapshot.pressureSignalMv === 'number' &&
    Number.isFinite(snapshot.pressureSensitivityMvPerKPa) &&
    snapshot.pressureSensitivityMvPerKPa > 0
    ? Math.max(0, snapshot.pressureSignalMv / snapshot.pressureSensitivityMvPerKPa)
    : null;
  const currentDeltaPValue = currentDeltaPKPa === null ? '--' : formatMetric(currentDeltaPKPa, 2);
  const pressureSafetyStatusLabel = snapshot.pressureSafetyStatus === 'danger'
    ? '超出安全范围'
    : snapshot.pressureSafetyStatus === 'warning'
      ? '接近上限'
      : '安全';
  const pressureSafetyNote = snapshot.pressureSafetyStatus === 'danger'
    ? '停止打气'
    : snapshot.pressureSafetyStatus === 'warning'
      ? '注意压力表'
      : '可继续观察';
  const zeroStatusLabel = snapshot.pressureZeroAdjusted
    ? '已完成'
    : snapshot.canZeroPressure
      ? '可调零'
      : '未就绪';
  const currentHint = getHeatCapacityCurrentHint(snapshot);
  void controller;
  void language;

  return (
    <div className="studio-realtime-panel studio-realtime-panel-heat">
      <div className="studio-heat-monitor-header" data-heat-capacity-realtime-header="true">
        <div>
          <span>Realtime Data / Charts</span>
          <strong>空气比热容比实验</strong>
        </div>
        <div className="studio-heat-status-badges">
          {heatCapacityHeaderBadges.map((badge) => (
            <span key={badge.key} className={`studio-heat-status-badge ${badge.className}`}>{badge.label}</span>
          ))}
        </div>
      </div>
      <div className="studio-heat-live-readings" data-heat-capacity-live-readings="true">
        <div className="studio-heat-reading-card studio-heat-reading-card-primary">
          <span>{renderScientificText('U_T / mV')}</span>
          <strong>{temperatureSignalValue}</strong>
          <em>温度信号</em>
        </div>
        <div className="studio-heat-reading-card studio-heat-reading-card-primary">
          <span>{renderScientificText('U_p / mV')}</span>
          <strong>{pressureSignalValue}</strong>
          <em>压强差电压</em>
        </div>
        <div className="studio-heat-reading-card">
          <span>{renderScientificText('ΔP / kPa')}</span>
          <strong>{currentDeltaPValue}</strong>
          <em>由当前 {renderScientificText('U_p')} 换算</em>
        </div>
        <div className={`studio-heat-reading-card studio-heat-safety-card studio-heat-safety-${snapshot.pressureSafetyStatus}`}>
          <span>压力状态</span>
          <strong>{pressureSafetyStatusLabel}</strong>
          <em>{pressureSafetyNote}</em>
        </div>
      </div>
      <div className="studio-heat-operation-status" data-heat-capacity-operation-status="true">
        <div><span>打气阀门</span><strong>{snapshot.pumpValveOpen ? '已打开' : '已关闭'}</strong></div>
        <div><span>玻璃旋塞</span><strong>{stopcockStateLabel}</strong></div>
        <div><span>压强调零</span><strong>{zeroStatusLabel}</strong></div>
      </div>
      <div className="studio-heat-current-hint" data-heat-capacity-current-hint="true">
        <span>当前提示</span>
        <strong>{renderScientificText(currentHint)}</strong>
      </div>
      <div className="studio-heat-live-chart-section" data-heat-capacity-live-charts="true">
        <div className="studio-heat-section-title">
          <span>Live Charts</span>
          <strong>实时曲线观察</strong>
        </div>
        <div className="studio-heat-trace-charts studio-heat-trace-charts-disabled">
          <div className="studio-live-chart-empty studio-live-chart-empty-wide">
            实时曲线已临时关闭，用于性能诊断。
          </div>
        </div>
      </div>
    </div>
  );
});

HeatCapacityRealtimePanel.displayName = 'HeatCapacityRealtimePanel';

export const HeatCapacityRealtimePanelConnected = memo(({
  autoDemoInteractionLocked,
  autoDemoPaused,
  autoDemoRunning,
  controller,
  language,
}: HeatCapacityRealtimePanelConnectedProps) => {
  const snapshot = React.useSyncExternalStore(
    controller?.subscribeRealtime ?? subscribeToNoopStore,
    controller?.getRealtimeSnapshot ?? getNullHeatCapacityRealtimeSnapshot,
    getNullHeatCapacityRealtimeSnapshot,
  );

  return (
    <HeatCapacityRealtimePanel
      autoDemoInteractionLocked={autoDemoInteractionLocked}
      autoDemoPaused={autoDemoPaused}
      autoDemoRunning={autoDemoRunning}
      controller={controller}
      language={language}
      snapshot={snapshot}
    />
  );
});

HeatCapacityRealtimePanelConnected.displayName = 'HeatCapacityRealtimePanelConnected';
