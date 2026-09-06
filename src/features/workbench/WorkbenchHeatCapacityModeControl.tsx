import {
  type HeatCapacityMode,
} from './workbenchHeatCapacityStateTypes.ts';
import {
  selectHeatCapacityModeControlState,
  type HeatCapacityModeControlAction,
} from '../heatCapacity/heatCapacityModeControlModel.ts';
import {
  LogOut,
  Play,
  Pause,
  Square,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import {
  isExperimentTutorialModeUnlocked,
} from '../learning/workbenchTutorialAccessPolicy.ts';

export interface WorkbenchHeatCapacityModeControlProps {
  autoDemoPhase: import('../heatCapacity/heatCapacityModeControlModel.ts').HeatCapacityAutoDemoPhase;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  experienceProfile: import('../learning/experimentLearningModel.ts').AppExperienceProfile;
  tutorialActive: boolean;
  activeTutorialExperiment: import('../learning/experimentLearningModel.ts').ExperimentLearningId;
  heatCapacityResetFeedbackActionId: "reset-guide";
  heatCapacityModeTransitionLocked: boolean;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  exitHeatCapacityGuideMode: () => void;
  exitCompletedHeatCapacityTeachingMode: () => void;
  runHeatCapacityAutoDemo: () => void;
  pauseHeatCapacityAutoDemo: () => void;
  terminateHeatCapacityAutoDemo: () => void;
  resetHeatCapacityGuideExperiment: () => void;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  exitHeatCapacityFormalModeToExplore: (sourceMode: import('../../domain/heatCapacity/heatCapacityModeTypes.ts').HeatCapacityMode) => boolean;
  heatCapacityModeTransitionState: import('../heatCapacity/heatCapacityModeTransitionModel.ts').HeatCapacityModeTransitionState;
  handleHeatCapacityModeSegmentClick: (mode: import('../../domain/heatCapacity/heatCapacityModeTypes.ts').HeatCapacityMode) => void;
  openHeatCapacityLessonIntro: (fileId?: string) => void;
}

export const WorkbenchHeatCapacityModeControl = ({
  autoDemoPhase,
  activeFile,
  experienceProfile,
  tutorialActive,
  activeTutorialExperiment,
  heatCapacityResetFeedbackActionId,
  heatCapacityModeTransitionLocked,
  heatCapacityRealtimeCopy,
  exitHeatCapacityGuideMode,
  exitCompletedHeatCapacityTeachingMode,
  runHeatCapacityAutoDemo,
  pauseHeatCapacityAutoDemo,
  terminateHeatCapacityAutoDemo,
  resetHeatCapacityGuideExperiment,
  settingsLanguagePreference,
  exitHeatCapacityFormalModeToExplore,
  heatCapacityModeTransitionState,
  handleHeatCapacityModeSegmentClick,
  openHeatCapacityLessonIntro,
}: WorkbenchHeatCapacityModeControlProps) => {
    if (activeFile.kind !== 'heatCapacity') return null;
    const heatCapacityActiveMode: HeatCapacityMode | null = activeFile.heatCapacityMode;
    const tutorialMilestone = experienceProfile.learning.heatCapacity;
    const heatCapacityTutorialActive = tutorialActive && activeTutorialExperiment === 'heatCapacity';
    const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';
    const heatCapacityModeControlState = selectHeatCapacityModeControlState({
      activeMode: heatCapacityActiveMode,
      autoDemoPhase,
      teachingCompleted: heatCapacityTeachingCompleted,
    });
    const heatCapacityDemoActionsVisible = heatCapacityModeControlState.demo.actionsVisible;
    const heatCapacityGuideActionsVisible = heatCapacityModeControlState.guide.actionsVisible;
    const heatCapacityFreeActionsVisible = heatCapacityModeControlState.free.actionsVisible;
    const heatCapacityModeSegmentClassName = (mode: HeatCapacityMode) => `studio-heat-mode-segment studio-heat-mode-segment-${mode} ${heatCapacityActiveMode === mode ? 'studio-heat-mode-segment-active' : ''}`;
    
    const heatCapacityModeActionClassName = (action: HeatCapacityModeControlAction) => {
      const resetFeedbackClass = action.id === heatCapacityResetFeedbackActionId
        ? ' studio-heat-mode-action-feedback'
        : '';
      const toneClass = action.tone === 'danger' ? ' studio-heat-mode-action-danger' : '';
      const disabledClass = action.disabled || heatCapacityModeTransitionLocked
        ? ' studio-heat-mode-action-disabled'
        : '';
      return `studio-heat-mode-action studio-heat-mode-action-icon${toneClass}${resetFeedbackClass}${disabledClass}`;
    };
    const renderHeatCapacityModeAction = (action: HeatCapacityModeControlAction) => {
      if (action.id === 'exit-teaching') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="exit-teaching"
            data-prompt-tooltip={heatCapacityRealtimeCopy.exitTeachingMode}
            aria-label={heatCapacityRealtimeCopy.exitTeachingMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={heatCapacityActiveMode === 'guide' ? exitHeatCapacityGuideMode : exitCompletedHeatCapacityTeachingMode}
          >
            <LogOut size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'resume-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="resume-demo"
            data-prompt-tooltip={heatCapacityRealtimeCopy.autoDemoResume}
            aria-label={heatCapacityRealtimeCopy.autoDemoResume}
            disabled={heatCapacityModeTransitionLocked}
            onClick={runHeatCapacityAutoDemo}
          >
            <Play size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'pause-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="pause-demo"
            data-prompt-tooltip={heatCapacityRealtimeCopy.autoDemoPause}
            aria-label={heatCapacityRealtimeCopy.autoDemoPause}
            disabled={heatCapacityModeTransitionLocked}
            onClick={() => pauseHeatCapacityAutoDemo()}
          >
            <Pause size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'stop-demo') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="stop-demo"
            data-prompt-tooltip={heatCapacityRealtimeCopy.autoDemoStop}
            aria-label={heatCapacityRealtimeCopy.autoDemoStop}
            disabled={heatCapacityModeTransitionLocked}
            onClick={terminateHeatCapacityAutoDemo}
          >
            <Square size={12} strokeWidth={2.8} />
          </button>
        );
      }
      if (action.id === 'exit-guide') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="exit-guide"
            data-prompt-tooltip={heatCapacityRealtimeCopy.exitGuideMode}
            aria-label={heatCapacityRealtimeCopy.exitGuideMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={exitHeatCapacityGuideMode}
          >
            <Square size={12} strokeWidth={2.8} />
          </button>
        );
      }
      if (action.id === 'reset-guide') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="reset-guide"
            data-prompt-tooltip={heatCapacityRealtimeCopy.resetGuideMode}
            aria-label={heatCapacityRealtimeCopy.resetGuideMode}
            disabled={heatCapacityModeTransitionLocked}
            onClick={resetHeatCapacityGuideExperiment}
          >
            <RotateCcw size={13} strokeWidth={2.7} />
          </button>
        );
      }
      if (action.id === 'exit-free') {
        return (
          <button
            key={action.id}
            type="button"
            className={heatCapacityModeActionClassName(action)}
            data-heat-capacity-mode-action="exit-free"
            data-prompt-tooltip={settingsLanguagePreference === 'en' ? 'Exit Free mode' : settingsLanguagePreference === 'zh-TW' ? '退出自由模式' : '退出自由模式'}
            aria-label={settingsLanguagePreference === 'en' ? 'Exit Free mode' : settingsLanguagePreference === 'zh-TW' ? '退出自由模式' : '退出自由模式'}
            disabled={heatCapacityModeTransitionLocked}
            onClick={() => exitHeatCapacityFormalModeToExplore('free')}
          >
            <LogOut size={13} strokeWidth={2.7} />
          </button>
        );
      }
      return null;
    };

    return (
      <div className="studio-heat-mode-control-row">
        <div
           className={`studio-heat-mode-control studio-heat-mode-control-${heatCapacityActiveMode ?? 'explore'} ${heatCapacityModeControlState.expanded ? 'studio-heat-mode-control-expanded' : ''} ${heatCapacityTutorialActive ? `studio-heat-mode-control-tutorial-${tutorialMilestone}` : ''}`}
           data-heat-capacity-mode-control="true"
           data-heat-capacity-tutorial-milestone={heatCapacityTutorialActive ? tutorialMilestone : undefined}
           data-heat-capacity-mode-transition-phase={heatCapacityModeTransitionState.phase}
           data-heat-capacity-visible-mode={heatCapacityModeTransitionState.visibleMode ?? ''}
           data-heat-capacity-source-mode={heatCapacityModeTransitionState.sourceMode ?? ''}
           data-heat-capacity-target-mode={heatCapacityModeTransitionState.targetMode ?? ''}
           data-heat-capacity-queued-mode={heatCapacityModeTransitionState.queuedMode ?? ''}
           data-heat-capacity-transition-request-id={heatCapacityModeTransitionState.requestId}
           data-heat-capacity-transition-blockers={heatCapacityModeTransitionState.sourceBlockers.join(',')}
           aria-busy={heatCapacityModeTransitionLocked}
        >
          <div
            className={heatCapacityModeSegmentClassName('demo')}
            data-heat-capacity-mode-segment="demo"
          >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'demo' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="demo"
            aria-pressed={heatCapacityActiveMode === 'demo'}
            onClick={() => handleHeatCapacityModeSegmentClick('demo')}
          >
            {heatCapacityRealtimeCopy.modeDemo}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-demo" aria-hidden={!heatCapacityDemoActionsVisible}>
            {heatCapacityModeControlState.demo.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div>
        {(!heatCapacityTutorialActive || isExperimentTutorialModeUnlocked(tutorialMilestone, 'guide')) ? <div
          className={heatCapacityModeSegmentClassName('guide')}
          data-heat-capacity-mode-segment="guide"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'guide' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="guide"
            aria-pressed={heatCapacityActiveMode === 'guide'}
            onClick={() => handleHeatCapacityModeSegmentClick('guide')}
          >
            {heatCapacityRealtimeCopy.modeGuide}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-guide" aria-hidden={!heatCapacityGuideActionsVisible}>
            {heatCapacityModeControlState.guide.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div> : null}
        {(!heatCapacityTutorialActive || isExperimentTutorialModeUnlocked(tutorialMilestone, 'free')) ? <div
          className={heatCapacityModeSegmentClassName('free')}
          data-heat-capacity-mode-segment="free"
        >
          <button
            type="button"
            className={`studio-heat-mode-button ${heatCapacityActiveMode === 'free' ? 'studio-heat-mode-button-active' : ''}`}
            data-heat-capacity-mode="free"
            aria-pressed={heatCapacityActiveMode === 'free'}
            onClick={() => handleHeatCapacityModeSegmentClick('free')}
          >
            {heatCapacityRealtimeCopy.modeFree}
          </button>
          <div className="studio-heat-mode-actions studio-heat-mode-actions-free" aria-hidden={!heatCapacityFreeActionsVisible}>
            {heatCapacityModeControlState.free.actions.map(renderHeatCapacityModeAction)}
          </div>
        </div> : null}
        </div>
        <button
          type="button"
          className="studio-heat-guide-lesson-button"
          data-heat-capacity-guide-lesson-button="true"
          data-prompt-tooltip={heatCapacityRealtimeCopy.guideLessonButtonLabel}
          aria-label={heatCapacityRealtimeCopy.guideLessonButtonLabel}
          onClick={() => openHeatCapacityLessonIntro(activeFile.id)}
        >
          <Wrench size={18} strokeWidth={2.1} />
        </button>
      </div>
    );
  };
