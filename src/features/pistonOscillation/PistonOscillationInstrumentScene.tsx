import React, { useMemo, useState, useSyncExternalStore } from 'react';
import type { WorkbenchPistonOscillationCameraPreset } from '../workbench/workbenchState.ts';
import {
  PistonOscillationInteractionWorkspace,
  type PistonOscillationGuideActionAttempt,
  type PistonOscillationGuideHeightResetRequest,
  type PistonOscillationGuideInstrumentSnapshot,
  type PistonOscillationGuideSupportLossEvent,
  type PistonOscillationGuideVisualCue,
} from './PistonOscillationFocusInteractionPreviewPage.tsx';
import type { PistonOscillationReleaseEvent } from './PistonOscillationAcquisitionPanel.tsx';
import {
  getPistonOscillationDemoFrame,
  type PistonOscillationDemoFrame,
} from './pistonOscillationDemoTimeline.ts';
import {
  PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT,
  type PistonOscillationDemoPlaybackChannel,
} from './pistonOscillationDemoPlaybackChannel.ts';
import type { PistonOscillationLivePhysicalState } from './pistonOscillationLivePressureChannel.ts';
import type {
  PistonOscillationGuideFocusMode,
  PistonOscillationGuideInstrumentRestoreState,
} from './pistonOscillationGuidePresentation.ts';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { getPistonOscillationShellCopy } from './pistonOscillationCopy.ts';
import './PistonOscillationPlaceholders.css';

const subscribeToNoDemoPlayback = () => () => undefined;
const getNoDemoPlaybackSnapshot = () => PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT;

class PistonOscillationInteractionSceneBoundary extends React.Component<{
  children: React.ReactNode;
  title: string;
  body: string;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Piston-oscillation interaction scene failed.', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="piston-oscillation-scene-status piston-oscillation-scene-status-error" role="alert">
        <strong>{this.props.title}</strong>
        <span>{this.props.body}</span>
      </div>
    );
  }
}

export interface PistonOscillationInstrumentSceneProps {
  language: PistonOscillationLanguage;
  powerOn: boolean;
  onPowerToggle?: (powerOn: boolean) => void;
  sceneTheme: 'light' | 'dark';
  cameraPreset: WorkbenchPistonOscillationCameraPreset;
  className?: string;
  measurementCycleRevision?: number;
  guideSessionRevision?: number;
  onReleaseEvent?: (event: PistonOscillationReleaseEvent) => void;
  onLivePhysicalStateChange?: (
    state: PistonOscillationLivePhysicalState,
  ) => void;
  demoFrame?: PistonOscillationDemoFrame;
  demoPlaybackChannel?: PistonOscillationDemoPlaybackChannel;
  demoPlaybackFileId?: string;
  demoPlaybackPhase?: 'idle' | 'running' | 'paused' | 'terminated' | 'completed';
  guidePaused?: boolean;
  guideTimeFrozen?: boolean;
  guideVisualCue?: PistonOscillationGuideVisualCue;
  guidePulseElapsedSeconds?: number;
  guideRequestedFocusMode?: PistonOscillationGuideFocusMode;
  guideSnapTargetHeightMm?: number | null;
  guideInitialInstrumentState?: PistonOscillationGuideInstrumentRestoreState | null;
  guideHeightReset?: PistonOscillationGuideHeightResetRequest | null;
  viewportWarningFeedbackId?: string | null;
  overlayTopRight?: React.ReactNode;
  overlayCenter?: React.ReactNode;
  overlayCenterAboveGuideMask?: boolean;
  onGuideInstrumentSnapshotChange?: (
    snapshot: PistonOscillationGuideInstrumentSnapshot,
  ) => void;
  onGuideActionAttempt?: PistonOscillationGuideActionAttempt;
  onGuideHeightConfirmed?: (snapshot: PistonOscillationGuideInstrumentSnapshot) => void;
  onGuideSupportLoss?: (
    event: PistonOscillationGuideSupportLossEvent,
  ) => void;
  onGuideHeightResetComplete?: () => void;
  operationVisualizationEnabled?: boolean;
  onOperationVisualizationToggle?: () => void;
  showShiftOperationCue?: boolean;
}

export const PistonOscillationInstrumentScene = ({
  language,
  powerOn,
  onPowerToggle,
  sceneTheme,
  cameraPreset,
  className = '',
  measurementCycleRevision = 0,
  guideSessionRevision = 0,
  onReleaseEvent,
  onLivePhysicalStateChange,
  demoFrame: providedDemoFrame,
  demoPlaybackChannel,
  demoPlaybackFileId,
  demoPlaybackPhase,
  guidePaused,
  guideTimeFrozen,
  guideVisualCue,
  guidePulseElapsedSeconds,
  guideRequestedFocusMode,
  guideSnapTargetHeightMm,
  guideInitialInstrumentState,
  guideHeightReset,
  viewportWarningFeedbackId,
  overlayTopRight,
  overlayCenter,
  overlayCenterAboveGuideMask,
  onGuideInstrumentSnapshotChange,
  onGuideActionAttempt,
  onGuideHeightConfirmed,
  onGuideSupportLoss,
  onGuideHeightResetComplete,
  operationVisualizationEnabled,
  onOperationVisualizationToggle,
  showShiftOperationCue,
}: PistonOscillationInstrumentSceneProps) => {
  const copy = getPistonOscillationShellCopy(language);
  const [overviewRevision, setOverviewRevision] = useState(0);
  const demoPlaybackSnapshot = useSyncExternalStore(
    demoPlaybackChannel?.subscribe ?? subscribeToNoDemoPlayback,
    demoPlaybackChannel?.getSnapshot ?? getNoDemoPlaybackSnapshot,
    getNoDemoPlaybackSnapshot,
  );
  const demoFrame = useMemo(() => {
    if (providedDemoFrame) return providedDemoFrame;
    if (
      !demoPlaybackFileId
      || demoPlaybackSnapshot.fileId !== demoPlaybackFileId
      || (
        demoPlaybackSnapshot.phase !== 'running'
        && demoPlaybackSnapshot.phase !== 'paused'
        && demoPlaybackSnapshot.phase !== 'completed'
      )
    ) return undefined;
    return getPistonOscillationDemoFrame(demoPlaybackSnapshot.elapsedMs, language);
  }, [demoPlaybackFileId, demoPlaybackSnapshot, language, providedDemoFrame]);

  return (
    <section
      className={`piston-oscillation-instrument-scene ${className}`.trim()}
      data-piston-oscillation-instrument-scene="true"
      data-piston-oscillation-camera-preset={cameraPreset}
      aria-label={copy.preview.ariaLabel}
    >
      <PistonOscillationInteractionSceneBoundary
        title={copy.preview.loadErrorTitle}
        body={copy.preview.loadErrorBody}
      >
        <PistonOscillationInteractionWorkspace
          language={language}
          powerOn={powerOn}
          onPowerToggle={onPowerToggle}
          embedded
          initialMode="overview"
          cameraPreset={cameraPreset}
          sceneTheme={sceneTheme}
          overviewRevision={overviewRevision}
          measurementCycleRevision={measurementCycleRevision}
          guideSessionRevision={guideSessionRevision}
          onReleaseEvent={onReleaseEvent}
          onLivePhysicalStateChange={onLivePhysicalStateChange}
          demoFrame={demoFrame}
          demoPlaybackPhase={demoPlaybackPhase}
          guidePaused={guidePaused}
          guideTimeFrozen={guideTimeFrozen}
          guideVisualCue={guideVisualCue}
          guidePulseElapsedSeconds={guidePulseElapsedSeconds}
          guideRequestedFocusMode={guideRequestedFocusMode}
          guideSnapTargetHeightMm={guideSnapTargetHeightMm}
          guideInitialInstrumentState={guideInitialInstrumentState}
          guideHeightReset={guideHeightReset}
          viewportWarningFeedbackId={viewportWarningFeedbackId}
          overlayTopRight={overlayTopRight}
          overlayCenter={overlayCenter}
          overlayCenterAboveGuideMask={overlayCenterAboveGuideMask}
          onGuideInstrumentSnapshotChange={onGuideInstrumentSnapshotChange}
          onGuideActionAttempt={onGuideActionAttempt}
          onGuideHeightConfirmed={onGuideHeightConfirmed}
          onGuideSupportLoss={onGuideSupportLoss}
          onGuideHeightResetComplete={onGuideHeightResetComplete}
          operationVisualizationEnabled={operationVisualizationEnabled}
          onOperationVisualizationToggle={onOperationVisualizationToggle}
          showShiftOperationCue={showShiftOperationCue}
          restoreDefaultViewLabel={copy.preview.restoreDefaultView}
          onRestoreDefaultView={() => {
            if (!demoFrame) setOverviewRevision((revision) => revision + 1);
          }}
        />
      </PistonOscillationInteractionSceneBoundary>
    </section>
  );
};

export default PistonOscillationInstrumentScene;
