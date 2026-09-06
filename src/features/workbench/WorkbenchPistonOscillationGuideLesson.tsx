import type React from 'react';
import {
  X,
} from 'lucide-react';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchPistonOscillationGuideLessonProps {
  pistonOscillationGuideLessonDialog: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonDialogState;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  getPistonOscillationGuideLessonView: (dialog: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonDialogState) => import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonView;
  advancePistonOscillationGuideLessonDialog: () => void;
  pistonOscillationGuideLessonDialogRef: React.MutableRefObject<HTMLElement>;
  pistonOscillationCopy: import('../pistonOscillation/pistonOscillationCopy.ts').PistonOscillationShellCopy;
  handlePistonOscillationGuideLessonDialogKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  closePistonOscillationGuideLessonDialog: () => void;
  pistonOscillationGuideLessonOutgoingView: import('./workbenchPistonGuidePresentation.ts').PistonOscillationGuideLessonView;
}

export const WorkbenchPistonOscillationGuideLesson = ({
  pistonOscillationGuideLessonDialog,
  activeFile,
  getPistonOscillationGuideLessonView,
  advancePistonOscillationGuideLessonDialog,
  pistonOscillationGuideLessonDialogRef,
  pistonOscillationCopy,
  handlePistonOscillationGuideLessonDialogKeyDown,
  closePistonOscillationGuideLessonDialog,
  pistonOscillationGuideLessonOutgoingView,
}: WorkbenchPistonOscillationGuideLessonProps) => {
    if (
      !pistonOscillationGuideLessonDialog
      || pistonOscillationGuideLessonDialog.fileId !== activeFile.id
    ) return null;
    const lessonView = getPistonOscillationGuideLessonView(
      pistonOscillationGuideLessonDialog,
    );
    if (!lessonView) return null;
    return (
      <div
        className={`studio-heat-guide-lesson-layer studio-piston-guide-lesson-layer studio-heat-guide-lesson-layer-${
          pistonOscillationGuideLessonDialog.closing ? 'closing' : 'open'
        }`}
        data-piston-oscillation-guide-lesson-layer="true"
        role="presentation"
        onMouseDown={advancePistonOscillationGuideLessonDialog}
      >
        <section
          ref={pistonOscillationGuideLessonDialogRef}
          className={`studio-heat-guide-lesson-card studio-piston-guide-lesson-card-long studio-heat-guide-lesson-card-${
            pistonOscillationGuideLessonDialog.kind === 'intro' ? 'intro' : 'step'
          } ${
            pistonOscillationGuideLessonDialog.kind === 'completion'
              ? 'studio-piston-guide-lesson-card-completion'
              : ''
          }`}
          data-piston-oscillation-guide-lesson-dialog="true"
          data-piston-oscillation-guide-lesson-kind={pistonOscillationGuideLessonDialog.kind}
          role="dialog"
          aria-label={
            pistonOscillationGuideLessonDialog.kind === 'completion'
              ? pistonOscillationCopy.guide.completedTitle
              : pistonOscillationGuideLessonDialog.kind === 'intro'
                ? pistonOscillationCopy.lesson.label
                : lessonView.title
          }
          aria-modal="true"
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={handlePistonOscillationGuideLessonDialogKeyDown}
        >
          <button
            type="button"
            className="studio-heat-guide-lesson-close"
            aria-label={pistonOscillationCopy.lesson.close}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              closePistonOscillationGuideLessonDialog();
            }}
          >
            <X size={13} strokeWidth={2.7} />
          </button>
          <div className="studio-heat-guide-lesson-kicker">
            <span>{pistonOscillationCopy.lesson.label}</span>
          </div>
          <div
            className={`studio-heat-guide-lesson-content-stack ${
              pistonOscillationGuideLessonOutgoingView
                ? 'studio-piston-guide-lesson-content-stack-transitioning'
                : ''
            }`}
          >
            {pistonOscillationGuideLessonOutgoingView ? (
              <div
                key={`outgoing-${pistonOscillationGuideLessonOutgoingView.key}`}
                className="studio-heat-guide-lesson-content studio-heat-guide-lesson-content-outgoing"
                aria-hidden="true"
              >
                <strong>{renderScientificText(pistonOscillationGuideLessonOutgoingView.title)}</strong>
                <p>{renderScientificText(pistonOscillationGuideLessonOutgoingView.body)}</p>
              </div>
            ) : null}
            <div
              key={`current-${lessonView.key}`}
              className="studio-heat-guide-lesson-content studio-heat-guide-lesson-content-current"
            >
              <strong>{renderScientificText(lessonView.title)}</strong>
              <p>{renderScientificText(lessonView.body)}</p>
            </div>
          </div>
          <div className="studio-heat-guide-lesson-hint">
            {pistonOscillationCopy.recovery.continueHint}
          </div>
        </section>
      </div>
    );
  };
