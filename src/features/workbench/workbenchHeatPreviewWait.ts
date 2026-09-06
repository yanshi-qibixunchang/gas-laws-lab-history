import { HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER, deriveHeatCapacityAutoDemoZeroKnobMotion, deriveHeatCapacityAutoDemoWaitTimer } from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import { getActiveHeatCapacityFreeTrialIndex } from './workbenchHeatCapacityFreeTrialState.ts';
import { deriveHeatCapacityGuideExperimentTimer } from '../../domain/heatCapacity/heatCapacityGuideExperimentTimerModel.ts';
import { deriveHeatCapacityFreeWorkbenchAttemptWaitTimer } from './workbenchHeatCapacityFreeAttemptState.ts';
import type React from 'react';

export interface deriveWorkbenchHeatPreviewWaitPorts {
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  autoDemoRunning: boolean;
  heatCapacityRefreshRestoring: boolean;
  initialHeatCapacityRefreshSession: import('./workbenchHeatCapacityRefreshSession.ts').WorkbenchHeatCapacityRefreshSession | null;
  desktopExitQuiesced: boolean;
  desktopExitAutoDemoClockRef: React.MutableRefObject<import('../heatCapacity/heatCapacityModeTransitionDemoClock.ts').HeatCapacityModeTransitionDemoClock>;
  autoDemoTimelineClockMs: number;
  heatCapacityAutoDemoStartedAtMsRef: React.MutableRefObject<number>;
  autoDemoPaused: boolean;
  heatCapacityAutoDemoPausedElapsedMsRef: React.MutableRefObject<number>;
  heatCapacityAutoDemoTimelineRef: React.MutableRefObject<import('../../domain/heatCapacity/heatCapacityAutoDemo.ts').HeatCapacityAutoDemoTimelineItem[]>;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
}

export function deriveWorkbenchHeatPreviewWait({
  activeFile,
  autoDemoRunning,
  heatCapacityRefreshRestoring,
  initialHeatCapacityRefreshSession,
  desktopExitQuiesced,
  desktopExitAutoDemoClockRef,
  autoDemoTimelineClockMs,
  heatCapacityAutoDemoStartedAtMsRef,
  autoDemoPaused,
  heatCapacityAutoDemoPausedElapsedMsRef,
  heatCapacityAutoDemoTimelineRef,
  heatCapacityRealtimeCopy,
}: deriveWorkbenchHeatPreviewWaitPorts) {
const heatCapacityActiveSpeedMultiplier = activeFile.heatCapacityMode === 'demo'
                ? HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER
                : activeFile.heatCapacityMode === 'guide'
                  ? activeFile.heatCapacityGuideWorkflow.speedMultiplier
                  : activeFile.heatCapacityFreeEquilibriumSpeedMultiplier;

const heatCapacityFreeActiveTrialIndex = activeFile.heatCapacityMode === 'free'
                ? getActiveHeatCapacityFreeTrialIndex(activeFile)
                : -1;

const heatCapacityFreeActiveTrial = heatCapacityFreeActiveTrialIndex >= 0
                ? activeFile.heatCapacityFreeRunWorkspace.trials[heatCapacityFreeActiveTrialIndex] ?? null
                : null;

const heatCapacityAutoDemoElapsedMs = activeFile.heatCapacityMode === 'demo'
                ? autoDemoRunning
                  ? heatCapacityRefreshRestoring &&
                    initialHeatCapacityRefreshSession?.activeHeatCapacityFileId === activeFile.id &&
                    initialHeatCapacityRefreshSession.mode === 'demo'
                    ? initialHeatCapacityRefreshSession.demo.elapsedMs
                    : desktopExitQuiesced && desktopExitAutoDemoClockRef.current?.fileId === activeFile.id
                      ? desktopExitAutoDemoClockRef.current.elapsedMs
                      : Math.max(0, autoDemoTimelineClockMs - heatCapacityAutoDemoStartedAtMsRef.current)
                  : autoDemoPaused
                    ? heatCapacityAutoDemoPausedElapsedMsRef.current
                    : 0
                : 0;

const heatCapacityAutoDemoZeroKnobMotion = activeFile.heatCapacityMode === 'demo'
                ? deriveHeatCapacityAutoDemoZeroKnobMotion(
                    heatCapacityAutoDemoTimelineRef.current,
                    heatCapacityAutoDemoElapsedMs,
                    activeFile.pressureZeroKnobAngle,
                  )
                : {
                    angleDeg: activeFile.pressureZeroKnobAngle,
                    progress: 1,
                    timelineDriven: false,
                  };

const heatCapacityAutoDemoWaitTimer = activeFile.heatCapacityMode === 'demo'
                ? deriveHeatCapacityAutoDemoWaitTimer(
                    heatCapacityAutoDemoTimelineRef.current,
                    heatCapacityAutoDemoElapsedMs,
                  )
                : null;

const heatCapacityWorkflowWaitTimer = activeFile.heatCapacityMode === 'guide'
                ? deriveHeatCapacityGuideExperimentTimer(
                    activeFile.heatCapacityGuideWorkflow,
                    activeFile.heatCapacityGuidePhysicsState.simulationTimeS,
                  )
                : activeFile.heatCapacityMode === 'free'
                  ? deriveHeatCapacityFreeWorkbenchAttemptWaitTimer(activeFile)
                  : null;

const heatCapacityWaitTimer = heatCapacityAutoDemoWaitTimer
                ? {
                    stage: heatCapacityAutoDemoWaitTimer.stage === 'u1' ? 'u1-wait' as const : 'u2-wait' as const,
                    elapsedS: heatCapacityAutoDemoWaitTimer.elapsedS,
                    targetS: heatCapacityAutoDemoWaitTimer.targetS,
                  }
                : heatCapacityWorkflowWaitTimer;

const heatCapacityWaitTimerDisplay =
                heatCapacityWaitTimer?.stage === 'u1-wait' ||
                heatCapacityWaitTimer?.stage === 'u2-wait' ||
                heatCapacityWaitTimer?.stage === 'u1-ready' ||
                heatCapacityWaitTimer?.stage === 'u2-ready'
                  ? {
                      label: heatCapacityWaitTimer.stage === 'u1-wait' || heatCapacityWaitTimer.stage === 'u1-ready'
                        ? heatCapacityRealtimeCopy.freeWaitTimerLabel.u1
                        : heatCapacityRealtimeCopy.freeWaitTimerLabel.u2,
                      statusText: heatCapacityWaitTimer.stage === 'u1-wait' || heatCapacityWaitTimer.stage === 'u1-ready'
                        ? activeFile.heatCapacityMode !== 'free'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u1
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                        : activeFile.heatCapacityMode !== 'free'
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.pending
                          : heatCapacityFreeActiveTrial?.u2
                          ? heatCapacityRealtimeCopy.freeWaitRecordStatus.rerecord
                          : heatCapacityRealtimeCopy.freeWaitRecordStatus.pending,
                    }
                  : null;

const heatCapacitySpeedOptionsDisabled = activeFile.heatCapacityMode === 'demo' || (
                activeFile.heatCapacityMode === 'guide' &&
                (heatCapacityWaitTimer?.stage === 'u1-ready' || heatCapacityWaitTimer?.stage === 'u2-ready')
              );

  return { heatCapacityActiveSpeedMultiplier, heatCapacityAutoDemoZeroKnobMotion, heatCapacityAutoDemoWaitTimer, heatCapacityWaitTimer, heatCapacityWaitTimerDisplay, heatCapacitySpeedOptionsDisabled };
}
