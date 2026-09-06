import {
  type PistonOscillationGuideStep,
  PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM,
  PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
} from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import {
  PISTON_OSCILLATION_GUIDE_CHECKLIST_CENTER_OFFSET_PX,
  PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX,
} from './workbenchTeachingUiTiming.ts';
import React from 'react';

export interface WorkbenchPistonOscillationGuideStepsProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  activePistonOscillationGuideSelected: boolean;
  activePistonOscillationDemoPlaybackPhase: import('../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts').PistonOscillationDemoPlaybackPhase;
  pistonOscillationCopy: import('../pistonOscillation/pistonOscillationCopy.ts').PistonOscillationShellCopy;
  pistonOscillationGuideChecklistViewedIndex: number;
  handlePistonOscillationGuideChecklistWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  handlePistonOscillationGuideChecklistKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  pistonOscillationGuideChecklistTrackRef: React.MutableRefObject<HTMLDivElement>;
  pistonOscillationGuideChecklistVisualOffsetRef: React.MutableRefObject<number>;
}

export const WorkbenchPistonOscillationGuideSteps = ({
  activeFile,
  activePistonOscillationGuideSelected,
  activePistonOscillationDemoPlaybackPhase,
  pistonOscillationCopy,
  pistonOscillationGuideChecklistViewedIndex,
  handlePistonOscillationGuideChecklistWheel,
  handlePistonOscillationGuideChecklistKeyDown,
  pistonOscillationGuideChecklistTrackRef,
  pistonOscillationGuideChecklistVisualOffsetRef,
}: WorkbenchPistonOscillationGuideStepsProps) => {
    if (
      activeFile.kind !== 'heatCapacityPistonOscillation'
      || (
        activeFile.pistonOscillationGuideSession.status !== 'active'
        && activeFile.pistonOscillationGuideSession.status !== 'completed'
      )
      || !activePistonOscillationGuideSelected
      || activePistonOscillationDemoPlaybackPhase !== 'idle'
    ) return null;
    const guideSession = activeFile.pistonOscillationGuideSession;
    if (
      guideSession.step === 'periodProcessing'
      || guideSession.step === 'calculationReady'
      || guideSession.step === 'completionReview'
    ) return null;
    type GuidePanelStep = {
      id: string;
      steps: readonly PistonOscillationGuideStep[];
      title: string;
      detail: string;
    };
    const createAcquisitionSteps = (
      measurementNumber: number,
    ): readonly GuidePanelStep[] => [
      { id: `screwLock-${measurementNumber}`, steps: ['screwLock'], title: pistonOscillationCopy.guide.lockScrewTitle, detail: pistonOscillationCopy.guide.lockScrewDetail },
      { id: `hoseReconnect-${measurementNumber}`, steps: ['hoseReconnect'], title: pistonOscillationCopy.guide.reconnectHoseTitle, detail: pistonOscillationCopy.guide.reconnectHoseDetail },
      { id: `screwLoosen-${measurementNumber}`, steps: ['screwLoosen'], title: pistonOscillationCopy.guide.loosenScrewTitle, detail: pistonOscillationCopy.guide.loosenScrewDetail },
      { id: `acquisitionReady-${measurementNumber}`, steps: ['acquisitionReady'], title: pistonOscillationCopy.guide.startAcquisitionTitle, detail: pistonOscillationCopy.guide.startAcquisitionDetail },
      { id: `waitingTrigger-${measurementNumber}`, steps: ['waitingTrigger'], title: pistonOscillationCopy.guide.releasePistonTitle, detail: pistonOscillationCopy.guide.releasePistonDetail },
      { id: `recording-${measurementNumber}`, steps: ['recording'], title: pistonOscillationCopy.guide.recordingTitle, detail: pistonOscillationCopy.guide.recordingDetail },
      { id: `pauseRecording-${measurementNumber}`, steps: ['pauseAvailable', 'curveFrozen'], title: pistonOscillationCopy.guide.pauseRecordingTitle, detail: pistonOscillationCopy.guide.pauseRecordingDetail },
      { id: `saveCurve-${measurementNumber}`, steps: ['awaitingSaveOrRedo'], title: pistonOscillationCopy.guide.saveCurveTitle(measurementNumber), detail: pistonOscillationCopy.guide.saveCurveDetail(measurementNumber) },
    ];
    const createFollowingMeasurementPage = (
      measurementIndex: 1 | 2,
    ): readonly GuidePanelStep[] => {
      const measurementNumber = measurementIndex + 1;
      const targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[measurementIndex];
      return [
        { id: `crossRunDisconnect-${measurementNumber}`, steps: ['crossRunDisconnect'], title: pistonOscillationCopy.guide.crossRunDisconnectTitle, detail: pistonOscillationCopy.guide.crossRunDisconnectDetail },
        { id: `nextHeightAdjustment-${measurementNumber}`, steps: ['nextHeightAdjustment'], title: pistonOscillationCopy.guide.adjustHeightTitle(targetHeightMm), detail: pistonOscillationCopy.guide.adjustHeightDetail(targetHeightMm) },
        ...createAcquisitionSteps(measurementNumber),
      ];
    };
    const guidePages: readonly (readonly GuidePanelStep[])[] = [
      [
        { id: 'powerOn-1', steps: ['powerOn'], title: pistonOscillationCopy.guide.powerOnTitle, detail: pistonOscillationCopy.guide.powerOnDetail },
        { id: 'parameterSetup-1', steps: ['parameterSetup'], title: pistonOscillationCopy.guide.parameterSetupTitle, detail: pistonOscillationCopy.guide.parameterSetupDetail },
        { id: 'firstHeightAdjustment-1', steps: ['firstHeightAdjustment'], title: pistonOscillationCopy.guide.adjustHeightTitle(PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[0]), detail: pistonOscillationCopy.guide.adjustHeightDetail(PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[0]) },
        ...createAcquisitionSteps(1),
      ],
      createFollowingMeasurementPage(1),
      [
        ...createFollowingMeasurementPage(2),
        { id: 'powerOff-3', steps: ['powerOff'], title: pistonOscillationCopy.guide.powerOffTitle, detail: pistonOscillationCopy.guide.powerOffDetail },
      ],
    ];
    const currentPageIndex = guideSession.status === 'completed'
      ? 2
      : guideSession.measurementIndex;
    const currentPage = guidePages[currentPageIndex];
    const guideCompleted = guideSession.status === 'completed';
    const currentLocalStepIndex = guideCompleted
      ? currentPage.length - 1
      : Math.max(
          0,
          currentPage.findIndex((step) => step.steps.includes(guideSession.step)),
        );
    const currentPageViewedIndex = Math.max(
      0,
      Math.min(currentPage.length - 1, pistonOscillationGuideChecklistViewedIndex),
    );
    const currentStepNumber = currentPageViewedIndex + 1;
    const totalStepCount = currentPage.length;
    return (
      <section
        className="studio-heat-guide-step-panel studio-piston-guide-step-panel"
        data-piston-oscillation-guide-step-panel="true"
        aria-label={pistonOscillationCopy.guide.checklist}
      >
        <div className="studio-heat-guide-step-header">
          <span>{pistonOscillationCopy.guide.checklist}</span>
          <em>{pistonOscillationCopy.guide.stepLabel} {currentStepNumber} / {totalStepCount}</em>
          <strong>
            {pistonOscillationCopy.acquisition.measurement(
              guideSession.measurementIndex + 1,
              PISTON_OSCILLATION_GUIDE_TOTAL_MEASUREMENTS,
            )}
          </strong>
        </div>
        <div className="studio-piston-guide-pages" aria-live="polite">
          <div
            className="studio-piston-guide-page-track"
            style={{ transform: `translate3d(-${currentPageIndex * 100}%, 0, 0)` }}
          >
            {guidePages.map((page, pageIndex) => {
              const pageCurrentIndex = pageIndex === currentPageIndex
                ? currentLocalStepIndex
                : pageIndex < currentPageIndex ? page.length - 1 : 0;
              const pageViewedIndex = pageIndex === currentPageIndex
                ? currentPageViewedIndex
                : pageCurrentIndex;
              const pageBaseOffset = PISTON_OSCILLATION_GUIDE_CHECKLIST_CENTER_OFFSET_PX
                - pageViewedIndex * PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
              return (
                <div
                  key={`measurement-page-${pageIndex + 1}`}
                  className="studio-piston-guide-page"
                  data-piston-oscillation-guide-page={pageIndex + 1}
                  aria-hidden={pageIndex !== currentPageIndex}
                >
                  <div
                    className="studio-heat-guide-step-list"
                    data-piston-oscillation-guide-step-list="true"
                    role="listbox"
                    tabIndex={pageIndex === currentPageIndex ? 0 : -1}
                    aria-label={
                      pageIndex === currentPageIndex
                        ? `${pistonOscillationCopy.guide.checklist}: ${pistonOscillationCopy.guide.stepLabel} ${currentStepNumber} / ${totalStepCount}`
                        : undefined
                    }
                    aria-activedescendant={
                      pageIndex === currentPageIndex
                        ? `piston-guide-step-${pageIndex}-${page[pageViewedIndex]?.id}`
                        : undefined
                    }
                    onWheel={
                      pageIndex === currentPageIndex
                        ? handlePistonOscillationGuideChecklistWheel
                        : undefined
                    }
                    onKeyDown={
                      pageIndex === currentPageIndex
                        ? handlePistonOscillationGuideChecklistKeyDown
                        : undefined
                    }
                  >
                    <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-top" />
                    <div className="studio-heat-guide-step-center-rail" />
                    <div
                      ref={
                        pageIndex === currentPageIndex
                          ? pistonOscillationGuideChecklistTrackRef
                          : undefined
                      }
                      className="studio-heat-guide-step-track studio-heat-guide-step-track-snapping"
                      data-piston-guide-current-index={pageCurrentIndex}
                      data-piston-guide-page-length={page.length}
                      style={{
                        '--studio-heat-guide-step-base-offset': `${pageBaseOffset}px`,
                        '--studio-heat-guide-step-visual-offset': `${pistonOscillationGuideChecklistVisualOffsetRef.current}px`,
                      } as React.CSSProperties}
                    >
                      {page.map((step, index) => {
                        const status = pageIndex < currentPageIndex || (
                          pageIndex === currentPageIndex
                          && (guideCompleted || index < currentLocalStepIndex)
                        )
                          ? 'done'
                          : pageIndex === currentPageIndex && index === currentLocalStepIndex
                            ? 'current'
                            : 'upcoming';
                        const centered = index === pageViewedIndex;
                        return (
                          <div
                            key={step.id}
                            id={`piston-guide-step-${pageIndex}-${step.id}`}
                            role="option"
                            aria-selected={centered}
                            aria-current={centered ? 'step' : undefined}
                            className={`studio-heat-guide-step-row studio-heat-guide-step-row-${status} ${centered ? 'studio-heat-guide-step-row-centered' : ''}`}
                            data-piston-oscillation-guide-step={
                              pageIndex === currentPageIndex
                              && step.steps.includes(guideSession.step)
                                ? guideSession.step
                                : step.id
                            }
                            data-piston-oscillation-guide-step-status={status}
                            style={{
                              '--studio-heat-guide-step-distance': Math.abs(index - pageViewedIndex),
                              '--studio-heat-guide-step-signed-distance': index - pageViewedIndex,
                            } as React.CSSProperties}
                          >
                            <span className="studio-heat-guide-step-marker" aria-hidden="true"><i /></span>
                            <span className="studio-heat-guide-step-text">
                              <strong>{step.title}</strong>
                              <em>{step.detail}</em>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-bottom" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="studio-piston-guide-page-dots" aria-label={`${currentPageIndex + 1} / 3`}>
          {[0, 1, 2].map((pageIndex) => (
            <i key={pageIndex} className={pageIndex === currentPageIndex ? 'is-active' : ''} aria-hidden="true" />
          ))}
        </div>
      </section>
    );
  };
