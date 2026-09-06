import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityDemoStepsProps {
  autoDemoStepPanelMode: "hidden" | "visible" | "exiting";
  autoDemoRunning: boolean;
  autoDemoPaused: boolean;
  autoDemoStepIndex: number;
  autoDemoStepCount: number;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  autoDemoStepTitle: string;
  autoDemoStepDescription: string;
  autoDemoStepTarget: string;
  autoDemoStepProgressCriterion: string;
  autoDemoStepNote: string;
}

export const WorkbenchHeatCapacityDemoSteps = ({
  autoDemoStepPanelMode,
  autoDemoRunning,
  autoDemoPaused,
  autoDemoStepIndex,
  autoDemoStepCount,
  heatCapacityRealtimeCopy,
  autoDemoStepTitle,
  autoDemoStepDescription,
  autoDemoStepTarget,
  autoDemoStepProgressCriterion,
  autoDemoStepNote,
}: WorkbenchHeatCapacityDemoStepsProps) => {
  return <div
                  className={`studio-heat-demo-step-panel studio-heat-demo-step-panel-${autoDemoStepPanelMode}`}
                  data-heat-capacity-demo-step-panel="true"
                >
                  <div className="studio-heat-demo-step-kicker">
                    <span>{autoDemoRunning || autoDemoPaused ? `Step ${autoDemoStepIndex} / ${autoDemoStepCount}` : heatCapacityRealtimeCopy.autoDemoFinishedLabel}</span>
                    <i>{autoDemoPaused ? heatCapacityRealtimeCopy.demoPausedLabel : autoDemoRunning ? heatCapacityRealtimeCopy.demoRunning : heatCapacityRealtimeCopy.demoDoneLabel}</i>
                  </div>
                  <strong>{renderScientificText(autoDemoStepTitle || heatCapacityRealtimeCopy.autoDemoFinishedTitle)}</strong>
                  <p>{renderScientificText(autoDemoStepDescription || heatCapacityRealtimeCopy.autoDemoFinishedDescription)}</p>
                  <div><span>{heatCapacityRealtimeCopy.demoTargetLabel}</span><em>{renderScientificText(autoDemoStepTarget || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoProgressLabel}</span><em>{renderScientificText(autoDemoStepProgressCriterion || '--')}</em></div>
                  <div><span>{heatCapacityRealtimeCopy.demoObservationLabel}</span><em>{renderScientificText(autoDemoStepNote || heatCapacityRealtimeCopy.demoFallbackNote)}</em></div>
                </div>;
};
