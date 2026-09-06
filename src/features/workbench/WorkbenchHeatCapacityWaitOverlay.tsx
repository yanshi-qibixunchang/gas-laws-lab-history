import {
  HeatCapacityWaitController,
} from '../heatCapacity/HeatCapacityWaitController.tsx';

export interface WorkbenchHeatCapacityWaitOverlayProps {
  heatCapacityAutoDemoWaitTimer: import('../../domain/heatCapacity/heatCapacityAutoDemo.ts').HeatCapacityAutoDemoWaitTimer;
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  heatCapacityWaitTimer: import('../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts').HeatCapacityGuideTimerState | import('../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts').HeatCapacityFreeAttemptWaitTimerState | { stage: "u1-wait" | "u2-wait"; elapsedS: number; targetS: number; };
  heatCapacityWaitTimerDisplay: { label: "U₁ 等待" | "U₂ 等待" | "U1 wait" | "U2 wait"; statusText: "未记录" | "可重记" | "未記錄" | "可重記" | "Not recorded" | "Can re-record"; };
  heatCapacityActiveSpeedMultiplier: 2 | 16 | 4 | 8;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  heatCapacitySpeedOptionsDisabled: boolean;
  updateHeatCapacityFreeEquilibriumSpeedMultiplier: (multiplier: number) => void;
}

export const WorkbenchHeatCapacityWaitOverlay = ({
  heatCapacityAutoDemoWaitTimer,
  activeFile,
  heatCapacityWaitTimer,
  heatCapacityWaitTimerDisplay,
  heatCapacityActiveSpeedMultiplier,
  heatCapacityRealtimeCopy,
  heatCapacitySpeedOptionsDisabled,
  updateHeatCapacityFreeEquilibriumSpeedMultiplier,
}: WorkbenchHeatCapacityWaitOverlayProps) => {
  return <div
                      className={`studio-heat-wait-overlay${
                        heatCapacityAutoDemoWaitTimer?.phase === 'exiting'
                          ? ' studio-heat-wait-overlay-exiting'
                          : ''
                      }`}
                      data-heat-capacity-wait-overlay="true"
                      data-heat-capacity-wait-mode={activeFile.heatCapacityMode}
                    >
                      <HeatCapacityWaitController
                        elapsedS={heatCapacityWaitTimer.elapsedS}
                        targetS={heatCapacityWaitTimer.targetS}
                        phaseLabel={heatCapacityWaitTimerDisplay.label}
                        statusText={heatCapacityWaitTimerDisplay.statusText}
                        speedMultiplier={heatCapacityActiveSpeedMultiplier}
                        speedLabelCode={heatCapacityRealtimeCopy.freeSpeedLabelCode}
                        speedLabel={heatCapacityRealtimeCopy.freeSpeedLabel}
                        speedAriaLabel={heatCapacityRealtimeCopy.freeSpeedAria}
                        speedOptionsDisabled={heatCapacitySpeedOptionsDisabled}
                        onSpeedMultiplierChange={updateHeatCapacityFreeEquilibriumSpeedMultiplier}
                      />
                    </div>;
};
