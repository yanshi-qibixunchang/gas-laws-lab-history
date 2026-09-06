import {
  getHeatCapacityGuideChecklistIndex,
  HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS,
} from './workbenchHeatCapacityGuidePresentation.ts';
import React from 'react';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';
import {
  type HeatCapacityGuideRecordKind,
} from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';

export interface WorkbenchHeatCapacityGuideStepsProps {
  activeHeatCapacityGuideStep: import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep;
  heatCapacityGuideChecklistViewedIndex: number;
  getGuideStepGuidance: (step: import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep, file?: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState) => { message: string; controlId: string; };
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX: 42;
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX: 48;
  heatCapacityGuideChecklistVisualOffsetRef: React.MutableRefObject<number>;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  handleHeatCapacityGuideChecklistWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  heatCapacityGuideChecklistTrackRef: React.MutableRefObject<HTMLDivElement>;
  activeGuideRecordKind: import('../../domain/heatCapacity/heatCapacityGuideTrialModel.ts').HeatCapacityGuideRecordKind;
  guideHeatCapacityPulseActive: boolean;
  guideHeatCapacityFocusControlId: string;
  recordHeatCapacityGuideSample: (kind: import('../../domain/heatCapacity/heatCapacityGuideTrialModel.ts').HeatCapacityGuideRecordKind) => void;
  getGuideRecordLabel: (kind: import('../../domain/heatCapacity/heatCapacityGuideTrialModel.ts').HeatCapacityGuideRecordKind) => "记录 U₀" | "记录 U₁ / Uₜ₁" | "记录 U₂ / Uₜ₂" | "記錄 U₀" | "記錄 U₁ / Uₜ₁" | "記錄 U₂ / Uₜ₂" | "Record U₀" | "Record U₁ / Uₜ₁" | "Record U₂ / Uₜ₂";
}

export const WorkbenchHeatCapacityGuideSteps = ({
  activeHeatCapacityGuideStep,
  heatCapacityGuideChecklistViewedIndex,
  getGuideStepGuidance,
  activeFile,
  HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX,
  HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX,
  heatCapacityGuideChecklistVisualOffsetRef,
  heatCapacityRealtimeCopy,
  settingsLanguagePreference,
  handleHeatCapacityGuideChecklistWheel,
  heatCapacityGuideChecklistTrackRef,
  activeGuideRecordKind,
  guideHeatCapacityPulseActive,
  guideHeatCapacityFocusControlId,
  recordHeatCapacityGuideSample,
  getGuideRecordLabel,
}: WorkbenchHeatCapacityGuideStepsProps) => {
  return (() => {
                    const heatCapacityGuideCurrentStepIndex = getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep);
                    const heatCapacityGuideViewedStepIndex = Math.max(
                      0,
                      Math.min(HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1, heatCapacityGuideChecklistViewedIndex),
                    );
                    const heatCapacityGuideSteps = HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.map((step, index) => {
                      const detail = getGuideStepGuidance(step.guideStep, activeFile).message;
                      const status = index < heatCapacityGuideCurrentStepIndex
                        ? 'done'
                        : index === heatCapacityGuideCurrentStepIndex
                          ? 'current'
                          : 'pending';
                      return {
                        ...step,
                        detail,
                        index,
                        status,
                        centerDistance: Math.abs(index - heatCapacityGuideViewedStepIndex),
                        signedDistance: index - heatCapacityGuideViewedStepIndex,
                      };
                    });
                    const viewedStep = heatCapacityGuideSteps[heatCapacityGuideViewedStepIndex] ?? heatCapacityGuideSteps[0];
                    const baseOffset = HEAT_CAPACITY_GUIDE_CHECKLIST_CENTER_OFFSET_PX -
                      heatCapacityGuideViewedStepIndex * HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX;
                    const trackStyle = {
                      '--studio-heat-guide-step-base-offset': `${baseOffset}px`,
                      '--studio-heat-guide-step-visual-offset': `${heatCapacityGuideChecklistVisualOffsetRef.current}px`,
                    } as React.CSSProperties;
                    return (
                      <section
                        className="studio-heat-guide-step-panel"
                        data-heat-capacity-guide-step-panel="true"
                        aria-label={heatCapacityRealtimeCopy.guideChecklistLabel}
                      >
                        <div className="studio-heat-guide-step-header">
                          <span>{heatCapacityRealtimeCopy.guideChecklistLabel}</span>
                          <em>
                            {heatCapacityRealtimeCopy.guideStepLabel}
                            {' '}
                            {heatCapacityGuideViewedStepIndex + 1}
                            {' / '}
                            {heatCapacityGuideSteps.length}
                          </em>
                          <strong>{renderScientificText(viewedStep.title[settingsLanguagePreference])}</strong>
                        </div>
                        <div
                          className="studio-heat-guide-step-list"
                          data-heat-capacity-guide-step-list="true"
                          onWheel={handleHeatCapacityGuideChecklistWheel}
                        >
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-top" aria-hidden="true" />
                          <div className="studio-heat-guide-step-center-rail" aria-hidden="true" />
                          <div
                            ref={heatCapacityGuideChecklistTrackRef}
                            className="studio-heat-guide-step-track studio-heat-guide-step-track-snapping"
                            style={trackStyle}
                          >
                            {heatCapacityGuideSteps.map((step) => {
                              const isCentered = step.index === heatCapacityGuideViewedStepIndex;
                              const requiredRecordKind: HeatCapacityGuideRecordKind | null =
                                step.guideStep === 'recordU0Required'
                                  ? 'u0'
                                  : step.guideStep === 'recordU1Required'
                                    ? 'u1'
                                    : step.guideStep === 'recordU2Required'
                                      ? 'u2'
                                      : null;
                              const stepRecordKind = step.status === 'current' && isCentered && requiredRecordKind === activeGuideRecordKind
                                ? requiredRecordKind
                                : null;
                              return (
                                <div
                                  key={step.id}
                                  className={`studio-heat-guide-step-row studio-heat-guide-step-row-${step.status} ${isCentered ? 'studio-heat-guide-step-row-centered' : ''} ${stepRecordKind ? 'studio-heat-guide-step-row-with-record' : ''}`}
                                  data-heat-capacity-guide-step-row={step.id}
                                  data-heat-capacity-guide-step-status={step.status}
                                  data-heat-capacity-guide-step-centered={isCentered ? 'true' : 'false'}
                                  style={{
                                    '--studio-heat-guide-step-distance': step.centerDistance,
                                    '--studio-heat-guide-step-signed-distance': step.signedDistance,
                                  } as React.CSSProperties}
                                >
                                  <span className="studio-heat-guide-step-marker" aria-hidden="true">
                                    <i />
                                  </span>
                                  <span className="studio-heat-guide-step-text">
                                    <strong>{renderScientificText(step.title[settingsLanguagePreference])}</strong>
                                    <em>{renderScientificText(step.detail)}</em>
                                  </span>
                                  {stepRecordKind ? (
                                    <span
                                      className={`studio-heat-guide-step-record-action studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''}`}
                                      data-heat-capacity-guide-step-record-action="true"
                                      data-heat-capacity-record-controls="true"
                                    >
                                      <button
                                        type="button"
                                        data-heat-capacity-guided-record={stepRecordKind}
                                        onClick={() => recordHeatCapacityGuideSample(stepRecordKind)}
                                      >
                                        {renderScientificText(getGuideRecordLabel(stepRecordKind))}
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          <div className="studio-heat-guide-step-fade studio-heat-guide-step-fade-bottom" aria-hidden="true" />
                        </div>
                      </section>
                    );
                  })();
};
