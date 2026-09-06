import HeatCapacityPreheatOverlay from '../heatCapacity/HeatCapacityPreheatOverlay.tsx';
import HeatCapacityInvalidAttemptDialog from '../heatCapacity/HeatCapacityInvalidAttemptDialog.tsx';
import {
  ShieldAlert,
} from 'lucide-react';
import {
  PromptViewportFeedback,
} from '../../components/prompts/PromptViewportFeedback.tsx';
import {
  PROMPT_FEEDBACK_COPY,
} from '../../components/prompts/promptFeedbackCopy.ts';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityCenterFeedbackProps {
  activeHeatCapacityPreheatLocked: boolean;
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  activeHeatCapacityPreheatMode: "demo" | "guide" | "free";
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  heatCapacityRefreshRestoring: boolean;
  heatCapacityModeTransitionLocked: boolean;
  autoDemoPaused: boolean;
  completeActiveHeatCapacityPreheat: () => void;
  activeHeatCapacityInvalidAttemptPrompt: boolean;
  restartHeatCapacityFreeExperiment: () => void;
  continueHeatCapacityInvalidAttempt: () => void;
  activeHeatCapacityModalLocked: boolean;
  activeHeatCapacityPressureAlarmVisible: boolean;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  autoDemoCompletionMessage: string;
  heatCapacityToastCurrent: import('../heatCapacity/heatCapacityToastController.ts').HeatCapacityToastMessage;
}

export const WorkbenchHeatCapacityCenterFeedback = ({
  activeHeatCapacityPreheatLocked,
  activeFile,
  activeHeatCapacityPreheatMode,
  settingsLanguagePreference,
  heatCapacityRefreshRestoring,
  heatCapacityModeTransitionLocked,
  autoDemoPaused,
  completeActiveHeatCapacityPreheat,
  activeHeatCapacityInvalidAttemptPrompt,
  restartHeatCapacityFreeExperiment,
  continueHeatCapacityInvalidAttempt,
  activeHeatCapacityModalLocked,
  activeHeatCapacityPressureAlarmVisible,
  heatCapacityRealtimeCopy,
  autoDemoCompletionMessage,
  heatCapacityToastCurrent,
}: WorkbenchHeatCapacityCenterFeedbackProps) => {
  return <>
                  {activeHeatCapacityPreheatLocked ? (
                    <HeatCapacityPreheatOverlay
                      key={`${activeFile.id}:${activeHeatCapacityPreheatMode}`}
                      language={settingsLanguagePreference}
                      paused={heatCapacityRefreshRestoring || heatCapacityModeTransitionLocked || (
                        activeHeatCapacityPreheatMode === 'demo' && autoDemoPaused
                      )}
                      onComplete={completeActiveHeatCapacityPreheat}
                    />
                  ) : null}
                  {activeHeatCapacityInvalidAttemptPrompt ? (
                    <HeatCapacityInvalidAttemptDialog
                      language={settingsLanguagePreference}
                      onReset={restartHeatCapacityFreeExperiment}
                      onContinue={continueHeatCapacityInvalidAttempt}
                    />
                  ) : null}
                  {!activeHeatCapacityModalLocked && activeHeatCapacityPressureAlarmVisible ? (
                    <div
                      className="studio-heat-pressure-warning"
                      data-heat-capacity-pressure-warning="true"
                      data-prompt-feedback-kind="danger"
                      data-prompt-feedback-persistent="true"
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                    >
                      <ShieldAlert className="studio-heat-pressure-warning-icon" size={24} strokeWidth={2} aria-hidden="true" />
                      <div className="studio-heat-pressure-warning-kicker">
                        <span>{heatCapacityRealtimeCopy.safetyLimit}</span>
                        <em>{heatCapacityRealtimeCopy.safetyActive}</em>
                      </div>
                      <strong>{heatCapacityRealtimeCopy.pressureAlarmTitle}</strong>
                      <span>{heatCapacityRealtimeCopy.pressureWarningFallback}</span>
                      <em>{heatCapacityRealtimeCopy.pressureWarningObserve}</em>
                    </div>
                  ) : null}
                  {!activeHeatCapacityModalLocked && autoDemoCompletionMessage ? (
                    <div
                      className="studio-heat-demo-complete-toast"
                      data-heat-capacity-demo-complete-toast="true"
                      data-prompt-feedback-kind="success"
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <span className="studio-heat-toast-kicker">{heatCapacityRealtimeCopy.toastSystemKicker}</span>
                      <strong>{autoDemoCompletionMessage}</strong>
                    </div>
                  ) : null}
                  {!activeHeatCapacityModalLocked && heatCapacityToastCurrent ? (
                    <PromptViewportFeedback
                      key={heatCapacityToastCurrent.id}
                      id={heatCapacityToastCurrent.id}
                      kind={heatCapacityToastCurrent.level}
                      label={PROMPT_FEEDBACK_COPY[settingsLanguagePreference].kindLabels[
                        heatCapacityToastCurrent.level
                      ]}
                      durationMs={heatCapacityToastCurrent.durationMs}
                      dataAttributes={{
                        'data-heat-capacity-guide-step-hint': 'true',
                        'data-heat-capacity-toast': 'true',
                        'data-heat-capacity-toast-level': heatCapacityToastCurrent.level,
                        'data-prompt-feedback-source': heatCapacityToastCurrent.source,
                        'data-prompt-feedback-placement': 'viewport-center',
                        'data-prompt-feedback-owner': 'heat-capacity',
                      }}
                    >
                      {renderScientificText(heatCapacityToastCurrent.text)}
                    </PromptViewportFeedback>
                  ) : null}
                </>;
};
