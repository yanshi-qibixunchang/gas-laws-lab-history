import type React from 'react';
import {
  X,
} from 'lucide-react';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityGuideLessonProps {
  heatCapacityGuideLessonDialog: import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideLessonDialogState;
  getHeatCapacityGuideLessonView: (dialog: import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideLessonDialogState) => import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideLessonView;
  heatCapacityGuideLessonClosing: boolean;
  handleHeatCapacityGuideLessonDialogAdvance: () => void;
  heatCapacityGuideLessonDialogRef: React.MutableRefObject<HTMLElement>;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  handleHeatCapacityGuideLessonDialogKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  windowControlCopy: { controls: string; minimize: string; maximize: string; restore: string; close: string; };
  handleHeatCapacityGuideLessonCloseButtonMouseDown: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  handleHeatCapacityGuideLessonCloseButtonClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  heatCapacityGuideLessonOutgoingView: import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideLessonView;
}

export const WorkbenchHeatCapacityGuideLesson = ({
  heatCapacityGuideLessonDialog,
  getHeatCapacityGuideLessonView,
  heatCapacityGuideLessonClosing,
  handleHeatCapacityGuideLessonDialogAdvance,
  heatCapacityGuideLessonDialogRef,
  heatCapacityRealtimeCopy,
  handleHeatCapacityGuideLessonDialogKeyDown,
  windowControlCopy,
  handleHeatCapacityGuideLessonCloseButtonMouseDown,
  handleHeatCapacityGuideLessonCloseButtonClick,
  heatCapacityGuideLessonOutgoingView,
}: WorkbenchHeatCapacityGuideLessonProps) => {
    if (!heatCapacityGuideLessonDialog) return null;
    const lessonView = getHeatCapacityGuideLessonView(heatCapacityGuideLessonDialog);
    return (
      <div
        className={`studio-heat-guide-lesson-layer studio-heat-guide-lesson-layer-${heatCapacityGuideLessonClosing ? 'closing' : 'open'}`}
        data-heat-capacity-guide-lesson-layer="true"
        role="presentation"
        onMouseDown={handleHeatCapacityGuideLessonDialogAdvance}
      >
        <section
          ref={heatCapacityGuideLessonDialogRef}
          className={`studio-heat-guide-lesson-card studio-heat-guide-lesson-card-${heatCapacityGuideLessonDialog.kind}`}
          data-heat-capacity-guide-lesson-dialog="true"
          role="dialog"
          aria-label={heatCapacityRealtimeCopy.guideLessonDialogAria}
          aria-modal="true"
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={handleHeatCapacityGuideLessonDialogKeyDown}
        >
          <button
            type="button"
            className="studio-heat-guide-lesson-close"
            data-heat-capacity-guide-lesson-close="true"
            aria-label={windowControlCopy.close}
            onMouseDown={handleHeatCapacityGuideLessonCloseButtonMouseDown}
            onClick={handleHeatCapacityGuideLessonCloseButtonClick}
          >
            <X size={13} strokeWidth={2.7} />
          </button>
          <div className="studio-heat-guide-lesson-kicker">
            <span>{heatCapacityRealtimeCopy.guideLessonButtonLabel}</span>
          </div>
          <div className="studio-heat-guide-lesson-content-stack">
            {heatCapacityGuideLessonOutgoingView ? (
              <div
                key={`outgoing-${heatCapacityGuideLessonOutgoingView.key}`}
                className="studio-heat-guide-lesson-content studio-heat-guide-lesson-content-outgoing"
              >
                <strong>{renderScientificText(heatCapacityGuideLessonOutgoingView.title)}</strong>
                <p>{renderScientificText(heatCapacityGuideLessonOutgoingView.body)}</p>
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
          <div className="studio-heat-guide-lesson-hint" data-heat-capacity-guide-lesson-hint="true">
            {heatCapacityRealtimeCopy.guideLessonContinueHint}
          </div>
        </section>
      </div>
    );
  };
