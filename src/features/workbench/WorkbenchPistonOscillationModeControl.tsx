import {
  Play,
  Pause,
  Square,
  LogOut,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import {
  isExperimentTutorialModeUnlocked,
} from '../learning/workbenchTutorialAccessPolicy.ts';

export interface WorkbenchPistonOscillationModeControlProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  tutorialActive: boolean;
  activeTutorialExperiment: import('../learning/experimentLearningModel.ts').ExperimentLearningId;
  experienceProfile: import('../learning/experimentLearningModel.ts').AppExperienceProfile;
  pistonModeControl: { view: { demoSelected: boolean; demoRunning: boolean; demoPaused: boolean; demoCompleted: boolean; labels: { demo: string; guide: string; free: string; pauseDemo: string; resumeDemo: string; stopDemo: string; exitDemo: string; resetGuide: string; exitGuide: string; exitFree: string; }; guideSessionSelected: boolean; guideCompleted: boolean; guideSelected: boolean; freeSelected: boolean; interactionLocked: boolean; pistonModeExpanded: boolean; pistonModeName: string; }; commands: { startDemo: () => void; pauseDemo: () => void; resumeDemo: () => void; stopDemo: () => void; exitDemo: () => void; startGuide: () => void; exitGuide: () => void; resetGuide: () => void; startFree: () => void; exitFree: () => void; requestFreeSetup: () => void; }; };
  pistonOscillationDemoPlayback: { fileId: string; phase: "idle" | "running" | "paused" | "terminated" | "completed"; elapsedMs: number; };
  pistonOscillationGuideResetFeedback: boolean;
  pistonOscillationCopy: import('../pistonOscillation/pistonOscillationCopy.ts').PistonOscillationShellCopy;
  openPistonOscillationGuideLessonIntro: () => void;
}

export const WorkbenchPistonOscillationModeControl = ({
  activeFile,
  tutorialActive,
  activeTutorialExperiment,
  experienceProfile,
  pistonModeControl,
  pistonOscillationDemoPlayback,
  pistonOscillationGuideResetFeedback,
  pistonOscillationCopy,
  openPistonOscillationGuideLessonIntro,
}: WorkbenchPistonOscillationModeControlProps) => {
    if (activeFile.kind !== 'heatCapacityPistonOscillation') return null;
    const pistonTutorialActive = tutorialActive && activeTutorialExperiment === 'pistonOscillation';
    const tutorialMilestone = experienceProfile.learning.pistonOscillation;
    const { view: { demoSelected, demoRunning, demoPaused, demoCompleted, labels, guideCompleted, guideSelected, freeSelected, interactionLocked, pistonModeExpanded, pistonModeName }, commands: { startDemo, pauseDemo, resumeDemo, stopDemo, exitDemo, startGuide, exitGuide, resetGuide, startFree, exitFree } } = pistonModeControl!;

    

    return (
      <div className="studio-heat-mode-control-row">
        <div
          className={`studio-heat-mode-control studio-heat-mode-control-${pistonModeName} ${pistonModeExpanded ? 'studio-heat-mode-control-expanded' : ''} ${pistonTutorialActive ? `studio-heat-mode-control-tutorial-${tutorialMilestone}` : ''}`}
          data-piston-oscillation-mode-control="true"
          data-piston-oscillation-tutorial-milestone={pistonTutorialActive ? tutorialMilestone : undefined}
          data-piston-oscillation-demo-phase={
            demoSelected ? pistonOscillationDemoPlayback.phase : 'idle'
          }
          data-interaction-locked={interactionLocked || undefined}
        >
          <div
            className={`studio-heat-mode-segment studio-heat-mode-segment-demo ${demoSelected ? 'studio-heat-mode-segment-active' : ''}`}
            data-piston-oscillation-mode-segment="demo"
          >
            <button
              type="button"
              className={`studio-heat-mode-button ${demoSelected ? 'studio-heat-mode-button-active' : ''}`}
              data-piston-oscillation-mode="demo"
              aria-pressed={demoSelected}
              disabled={interactionLocked}
              onClick={startDemo}
            >
              {labels.demo}
            </button>
            <div
              className="studio-heat-mode-actions studio-heat-mode-actions-demo"
              aria-hidden={!demoSelected}
            >
              {demoRunning || demoPaused ? (
                <>
                  <button
                    type="button"
                    className="studio-heat-mode-action studio-heat-mode-action-icon"
                    data-piston-oscillation-mode-action={demoPaused ? 'resume-demo' : 'pause-demo'}
                    data-prompt-tooltip={demoPaused ? labels.resumeDemo : labels.pauseDemo}
                    aria-label={demoPaused ? labels.resumeDemo : labels.pauseDemo}
                    disabled={interactionLocked}
                    onClick={demoPaused ? resumeDemo : pauseDemo}
                  >
                    {demoPaused ? (
                      <Play size={13} strokeWidth={2.7} />
                    ) : (
                      <Pause size={13} strokeWidth={2.7} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                    data-piston-oscillation-mode-action="stop-demo"
                    data-prompt-tooltip={labels.stopDemo}
                    aria-label={labels.stopDemo}
                    disabled={interactionLocked}
                    onClick={stopDemo}
                  >
                    <Square size={12} strokeWidth={2.8} />
                  </button>
                </>
              ) : demoCompleted ? (
                <button
                  type="button"
                  className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                  data-piston-oscillation-mode-action="exit-demo"
                  data-prompt-tooltip={labels.exitDemo}
                  aria-label={labels.exitDemo}
                  disabled={interactionLocked}
                  onClick={exitDemo}
                >
                  <LogOut size={13} strokeWidth={2.7} />
                </button>
              ) : null}
            </div>
          </div>
          {(!pistonTutorialActive || isExperimentTutorialModeUnlocked(tutorialMilestone, 'guide')) ? <div
            className={`studio-heat-mode-segment studio-heat-mode-segment-guide ${guideSelected ? 'studio-heat-mode-segment-active' : ''}`}
            data-piston-oscillation-mode-segment="guide"
          >
            <button
              type="button"
              className={`studio-heat-mode-button ${guideSelected ? 'studio-heat-mode-button-active' : ''}`}
              data-piston-oscillation-mode="guide"
              aria-pressed={guideSelected}
              disabled={interactionLocked}
              onClick={startGuide}
            >
              {labels.guide}
            </button>
            <div
              className="studio-heat-mode-actions studio-heat-mode-actions-guide"
              aria-hidden={!guideSelected}
            >
              {guideSelected ? (
                <>
                  <button
                    type="button"
                    className={`studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger${
                      pistonOscillationGuideResetFeedback
                        ? ' studio-heat-mode-action-feedback'
                        : ''
                    }`}
                    data-piston-oscillation-mode-action="reset-guide"
                    data-prompt-tooltip={labels.resetGuide}
                    aria-label={labels.resetGuide}
                    disabled={interactionLocked}
                    onClick={resetGuide}
                  >
                    <RotateCcw size={13} strokeWidth={2.7} />
                  </button>
                  <button
                    type="button"
                    className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                    data-piston-oscillation-mode-action="exit-guide"
                    data-prompt-tooltip={labels.exitGuide}
                    aria-label={labels.exitGuide}
                    disabled={interactionLocked}
                    onClick={exitGuide}
                  >
                    {guideCompleted ? (
                      <LogOut size={13} strokeWidth={2.7} />
                    ) : (
                      <Square size={12} strokeWidth={2.8} />
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </div> : null}
          {(!pistonTutorialActive || isExperimentTutorialModeUnlocked(tutorialMilestone, 'free')) ? <div
            className={`studio-heat-mode-segment studio-heat-mode-segment-free ${freeSelected ? 'studio-heat-mode-segment-active' : ''}`}
            data-piston-oscillation-mode-segment="free"
          >
            <button
              type="button"
              className={`studio-heat-mode-button ${freeSelected ? 'studio-heat-mode-button-active' : ''}`}
              data-piston-oscillation-mode="free"
              aria-pressed={freeSelected}
              disabled={interactionLocked}
              onClick={startFree}
            >
              {labels.free}
            </button>
            <div
              className="studio-heat-mode-actions studio-heat-mode-actions-free"
              aria-hidden={!freeSelected}
            >
              {freeSelected ? (
                <button
                  type="button"
                  className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"
                  data-piston-oscillation-mode-action="exit-free"
                  data-prompt-tooltip={labels.exitFree}
                  aria-label={labels.exitFree}
                  disabled={interactionLocked}
                  onClick={exitFree}
                >
                  <LogOut size={13} strokeWidth={2.7} />
                </button>
              ) : null}
            </div>
          </div> : null}
        </div>
        <button
          type="button"
          className="studio-heat-guide-lesson-button"
          data-piston-oscillation-guide-lesson-button="true"
          data-prompt-tooltip={pistonOscillationCopy.lesson.buttonLabel}
          aria-label={pistonOscillationCopy.lesson.buttonLabel}
          disabled={interactionLocked}
          onClick={openPistonOscillationGuideLessonIntro}
        >
          <Wrench size={18} strokeWidth={2.1} />
        </button>
      </div>
    );
  };
