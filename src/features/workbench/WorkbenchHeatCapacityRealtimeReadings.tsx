import {
  isHeatCapacityPhysicalKernelMode,
  getHeatCapacityStopcockState,
  canZeroHeatCapacityPressure,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  getHeatCapacityFreeDisplayPhase,
} from './workbenchHeatCapacityFreeAttemptState.ts';
import {
  getActiveHeatCapacityFreeTrialIndex,
} from './workbenchHeatCapacityFreeTrialState.ts';
import {
  formatHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  formatMetric,
} from './workbenchPresentationFormatting.ts';
import {
  getLocalizedHeatCapacityPumpHint,
} from './workbenchHeatCapacityRealtimeCopy.ts';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityRealtimeReadingsProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  activeHeatCapacityFreeBatchProgress: import('../../domain/heatCapacity/heatCapacityFreeBatchModel.ts').HeatCapacityFreeBatchProgress;
  autoDemoInteractionLocked: boolean;
  autoDemoPaused: boolean;
  autoDemoRunning: boolean;
  activeHeatCapacityPressureAlarmVisible: boolean;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  guideHeatCapacityActiveFileId: string;
  getHeatCapacityGuideStep: (file: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState) => import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep;
  getGuideStepGuidance: (step: import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep, file?: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState) => { message: string; controlId: string; };
  activeHeatCapacityExperimentTitle: string;
}

export const WorkbenchHeatCapacityRealtimeReadings = ({
  activeFile,
  heatCapacityRealtimeCopy,
  activeHeatCapacityFreeBatchProgress,
  autoDemoInteractionLocked,
  autoDemoPaused,
  autoDemoRunning,
  activeHeatCapacityPressureAlarmVisible,
  settingsLanguagePreference,
  guideHeatCapacityActiveFileId,
  getHeatCapacityGuideStep,
  getGuideStepGuidance,
  activeHeatCapacityExperimentTitle,
}: WorkbenchHeatCapacityRealtimeReadingsProps) => {
    if (activeFile.kind !== 'heatCapacity') return null;

    const getHeatCapacityPhaseLabel = (phase: typeof activeFile.heatCapacityPhase) => {
      if (phase === 'powerOff') return heatCapacityRealtimeCopy.phaseLabels.powerOff;
      if (phase === 'readyToZero') return heatCapacityRealtimeCopy.phaseLabels.readyToZero;
      if (phase === 'zeroed') return heatCapacityRealtimeCopy.phaseLabels.zeroed;
      if (phase === 'readyToPump') return heatCapacityRealtimeCopy.phaseLabels.readyToPump;
      if (phase === 'pumping') return heatCapacityRealtimeCopy.phaseLabels.pumping;
      if (phase === 'sealedStabilizing') return heatCapacityRealtimeCopy.phaseLabels.sealedStabilizing;
      if (phase === 'releasing') return heatCapacityRealtimeCopy.phaseLabels.releasing;
      if (phase === 'recovering') return heatCapacityRealtimeCopy.phaseLabels.recovering;
      return heatCapacityRealtimeCopy.phaseLabels.fallback;
    };
    const heatCapacityDisplayPhase = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode)
      ? getHeatCapacityFreeDisplayPhase(activeFile)
      : activeFile.heatCapacityPhase;
    const phaseLabel = getHeatCapacityPhaseLabel(heatCapacityDisplayPhase);
    const stopcockState = getHeatCapacityStopcockState(activeFile.stopcockAngleDeg);
    const stopcockStateLabel = stopcockState === 'open' ? heatCapacityRealtimeCopy.stopcock.open : heatCapacityRealtimeCopy.stopcock.closed;
    const heatCapacityRunBadge = activeFile.heatCapacityMode === 'free'
      ? heatCapacityRealtimeCopy.trialBadge(
          activeHeatCapacityFreeBatchProgress?.currentGroupNumber ??
          Math.max(1, getActiveHeatCapacityFreeTrialIndex(activeFile) + 1),
        )
      : heatCapacityRealtimeCopy.singleTrialBadge;
    const heatCapacityHeaderBadges = [
      {
        key: 'stage',
        label: `${heatCapacityRealtimeCopy.stagePrefix}${phaseLabel}`,
        className: 'studio-heat-status-badge-stage',
      },
      {
        key: 'trial',
        label: heatCapacityRunBadge,
        className: 'studio-heat-status-badge-trial',
        dataAttr: true,
      },
      ...(autoDemoInteractionLocked
        ? [{
            key: 'demo',
            label: autoDemoPaused ? heatCapacityRealtimeCopy.demoPaused : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoReady,
            className: 'studio-heat-status-badge-mode',
          }]
        : []),
      ...(autoDemoInteractionLocked
        ? [{
            key: 'lock',
            label: heatCapacityRealtimeCopy.operationLocked,
            className: 'studio-heat-status-badge-warning',
          }]
        : []),
    ];
    const temperatureSignalValue = activeFile.powerOn && typeof activeFile.temperatureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.temperatureSignalMv)
      : '--.-';
    const pressureSignalValue = activeFile.powerOn && typeof activeFile.pressureSignalMv === 'number'
      ? formatHeatCapacitySignalMv(activeFile.pressureSignalMv)
      : '--.-';
    const currentDeltaPKPa = activeFile.powerOn &&
      typeof activeFile.pressureSignalMv === 'number' &&
      Number.isFinite(activeFile.pressureSensitivityMvPerKPa) &&
      activeFile.pressureSensitivityMvPerKPa > 0
      ? Math.max(0, activeFile.pressureSignalMv / activeFile.pressureSensitivityMvPerKPa)
      : null;
    const currentDeltaPValue = currentDeltaPKPa === null ? '--' : formatMetric(currentDeltaPKPa, 2);
    const effectivePressureSafetyStatus = activeHeatCapacityPressureAlarmVisible ? 'danger' : activeFile.pressureSafetyStatus;
    const pressureSafetyStatusLabel = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.danger
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warning
        : heatCapacityRealtimeCopy.safety.normal;
    const pressureSafetyNote = effectivePressureSafetyStatus === 'danger'
      ? heatCapacityRealtimeCopy.safety.dangerNote
      : effectivePressureSafetyStatus === 'warning'
        ? heatCapacityRealtimeCopy.safety.warningNote
        : heatCapacityRealtimeCopy.safety.normalNote;
    const zeroStatusLabel = activeFile.pressureZeroAdjusted
      ? heatCapacityRealtimeCopy.zeroStatus.completed
      : canZeroHeatCapacityPressure(activeFile)
        ? heatCapacityRealtimeCopy.zeroStatus.adjustable
        : heatCapacityRealtimeCopy.zeroStatus.notReady;
    const localizedHeatCapacityPumpHint = getLocalizedHeatCapacityPumpHint(
      activeFile.pumpHint,
      settingsLanguagePreference,
    );
    const currentHint = (() => {
      if (guideHeatCapacityActiveFileId === activeFile.id && !autoDemoInteractionLocked) {
        const guideStep = getHeatCapacityGuideStep(activeFile);
        if (guideStep !== 'idle' && guideStep !== 'completed') {
          return getGuideStepGuidance(guideStep, activeFile).message;
        }
      }
      if (!activeFile.powerOn || heatCapacityDisplayPhase === 'powerOff') return heatCapacityRealtimeCopy.hints.powerOff;
      if (heatCapacityDisplayPhase === 'readyToZero') return heatCapacityRealtimeCopy.hints.readyToZero;
      if (heatCapacityDisplayPhase === 'zeroed' || heatCapacityDisplayPhase === 'readyToPump') return heatCapacityRealtimeCopy.hints.readyToPump;
      if (heatCapacityDisplayPhase === 'pumping') return heatCapacityRealtimeCopy.hints.pumping;
      if (heatCapacityDisplayPhase === 'sealedStabilizing') return heatCapacityRealtimeCopy.hints.sealedStabilizing;
      if (heatCapacityDisplayPhase === 'releasing') return heatCapacityRealtimeCopy.hints.releasing;
      if (heatCapacityDisplayPhase === 'recovering') return heatCapacityRealtimeCopy.hints.recovering;
      return localizedHeatCapacityPumpHint || heatCapacityRealtimeCopy.hints.fallback;
    })();
    return (
      <div className="studio-realtime-panel studio-realtime-panel-heat">
        <div className="studio-heat-monitor-header" data-heat-capacity-realtime-header="true">
          <div className="studio-heat-monitor-title">
            <span>{heatCapacityRealtimeCopy.realtimeKicker}</span>
            <strong>{activeHeatCapacityExperimentTitle}</strong>
            <small>{renderScientificText(heatCapacityRealtimeCopy.realtimeSubtitle)}</small>
          </div>
          <div className="studio-heat-status-badges">
            {heatCapacityHeaderBadges.map((badge) => (
              <span
                key={badge.key}
                className={`studio-heat-status-badge ${badge.className}`}
                data-heat-capacity-trial-badge={badge.key === 'trial' ? 'true' : undefined}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
        <div className="studio-heat-live-readings" data-heat-capacity-live-readings="true">
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₜ / mV')}</span>
            <strong>{temperatureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.temperature}</em>
          </div>
          <div className="studio-heat-reading-card studio-heat-reading-card-primary">
            <span>{renderScientificText('Uₚ / mV')}</span>
            <strong>{pressureSignalValue}</strong>
            <em>{heatCapacityRealtimeCopy.readings.pressure}</em>
          </div>
          <div className="studio-heat-reading-card">
            <span>{renderScientificText('ΔP / kPa')}</span>
            <strong>{currentDeltaPValue}</strong>
            <em>{renderScientificText(heatCapacityRealtimeCopy.readings.delta)}</em>
          </div>
          <div className={`studio-heat-reading-card studio-heat-safety-card studio-heat-safety-${effectivePressureSafetyStatus}`}>
            <span>{heatCapacityRealtimeCopy.readings.safety}</span>
            <strong>{pressureSafetyStatusLabel}</strong>
            <em>{pressureSafetyNote}</em>
          </div>
        </div>
        <div className="studio-heat-operation-status" data-heat-capacity-operation-status="true">
          <div><span>{heatCapacityRealtimeCopy.readings.pumpValve}</span><strong>{activeFile.pumpValveOpen ? heatCapacityRealtimeCopy.readings.opened : heatCapacityRealtimeCopy.readings.closed}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.stopcock}</span><strong>{stopcockStateLabel}</strong></div>
          <div><span>{heatCapacityRealtimeCopy.readings.zero}</span><strong>{zeroStatusLabel}</strong></div>
        </div>
        <div className="studio-heat-current-hint" data-heat-capacity-current-hint="true">
          <span>{heatCapacityRealtimeCopy.readings.currentHint}</span>
          <strong>{renderScientificText(currentHint)}</strong>
        </div>
      </div>
    );
  };
