import type React from 'react';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';
import {
  Pause,
  Play,
  Square,
  X,
} from 'lucide-react';

export interface WorkbenchDockHeaderProps {
  panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  activePistonOscillationDataProcessing: boolean;
  activePistonOscillationProcessReview: boolean;
  pistonOscillationCopy: import('../pistonOscillation/pistonOscillationCopy.ts').PistonOscillationShellCopy;
  activePistonOscillationExpandedRealtime: boolean;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  renderHeatCapacityModeControl: () => React.ReactElement;
  renderPistonOscillationModeControl: () => React.ReactElement;
  toggleActiveFileRunState: () => void;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  stopActiveFile: () => void;
  closePistonOscillationProcessReview: () => void;
}

export const WorkbenchDockHeader = ({
  panel,
  activePistonOscillationDataProcessing,
  activePistonOscillationProcessReview,
  pistonOscillationCopy,
  activePistonOscillationExpandedRealtime,
  activeFile,
  renderHeatCapacityModeControl,
  renderPistonOscillationModeControl,
  toggleActiveFileRunState,
  workbenchCopy,
  stopActiveFile,
  closePistonOscillationProcessReview,
}: WorkbenchDockHeaderProps) => {
    const isProcessingRealtime = activePistonOscillationDataProcessing
      && panel.key === 'realtime';
    const isProcessReviewRealtime = activePistonOscillationProcessReview
      && panel.key === 'realtime';
    const headerTitle = isProcessReviewRealtime
      ? pistonOscillationCopy.review.title
      : isProcessingRealtime
        ? pistonOscillationCopy.processing.title
        : panel.title;
    const renderedHeaderHint = isProcessReviewRealtime
      ? renderScientificText(pistonOscillationCopy.review.hint)
      : isProcessingRealtime
        ? renderScientificText(pistonOscillationCopy.processing.hint)
        : renderScientificText(panel.hint);
    const showPanelActions = isProcessingRealtime
      || isProcessReviewRealtime
      || (panel.key === 'preview' && !activePistonOscillationExpandedRealtime);
    return (
    <div className="studio-dock-header">
      <div>
        <span>{headerTitle}</span>
        <small>{renderedHeaderHint}</small>
      </div>
      {showPanelActions ? (
        <div className="studio-panel-actions">
          {activeFile.kind === 'heatCapacity'
            ? renderHeatCapacityModeControl()
            : activeFile.kind === 'heatCapacityPistonOscillation'
              ? renderPistonOscillationModeControl()
              : (
            <button
              type="button"
              className={`studio-run-control studio-run-control-${activeFile.runState === 'running' ? 'pause' : 'start'}`}
              onClick={toggleActiveFileRunState}
              data-prompt-tooltip={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
              aria-label={activeFile.runState === 'running' ? workbenchCopy.actions.pause : workbenchCopy.actions.start}
            >
              {activeFile.runState === 'running' ? (
                <Pause size={14} strokeWidth={2.5} />
              ) : (
                <Play size={15} strokeWidth={2.5} />
              )}
            </button>
          )}
          {(activeFile.kind === 'standard' || activeFile.kind === 'ideal') &&
          (activeFile.runState === 'running' || activeFile.runState === 'paused') ? (
            <button
              type="button"
              className="studio-run-control studio-run-control-stop"
              onClick={stopActiveFile}
              data-prompt-tooltip={workbenchCopy.actions.stop}
              aria-label={workbenchCopy.actions.stop}
            >
              <Square size={13} strokeWidth={2.5} />
            </button>
          ) : null}
          {isProcessReviewRealtime ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                closePistonOscillationProcessReview();
              }}
              data-prompt-tooltip={pistonOscillationCopy.review.closeAria}
              aria-label={pistonOscillationCopy.review.closeAria}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
    );
  };
