import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityRecordControlsProps {
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  freeRecordControlsVisible: boolean;
  freeRecordU0ButtonState: import('./workbenchHeatCapacityFreeRecordState.ts').HeatCapacityFreeRecordButtonState;
  recordFreeHeatCapacitySample: (kind: 'u0' | 'u1' | 'u2') => void;
  freeRecordU1ButtonState: import('./workbenchHeatCapacityFreeRecordState.ts').HeatCapacityFreeRecordButtonState;
  freeRecordU2ButtonState: import('./workbenchHeatCapacityFreeRecordState.ts').HeatCapacityFreeRecordButtonState;
  getHeatCapacityGuideStep: (file: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState) => import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep;
  guideHeatCapacityActiveFileId: string | null;
  autoDemoInteractionLocked: boolean;
  heatCapacityRecordControlsClosing: import('../../domain/heatCapacity/heatCapacityGuideTrialModel.ts').HeatCapacityGuideRecordKind;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
  guideHeatCapacityPulseActive: boolean;
  guideHeatCapacityFocusControlId: string | null;
  recordHeatCapacityGuideSample: (kind: import('../../domain/heatCapacity/heatCapacityGuideTrialModel.ts').HeatCapacityGuideRecordKind) => void;
}

export const WorkbenchHeatCapacityRecordControls = ({
  activeFile,
  freeRecordControlsVisible,
  freeRecordU0ButtonState,
  recordFreeHeatCapacitySample,
  freeRecordU1ButtonState,
  freeRecordU2ButtonState,
  getHeatCapacityGuideStep,
  guideHeatCapacityActiveFileId,
  autoDemoInteractionLocked,
  heatCapacityRecordControlsClosing,
  heatCapacityRealtimeCopy,
  guideHeatCapacityPulseActive,
  guideHeatCapacityFocusControlId,
  recordHeatCapacityGuideSample,
}: WorkbenchHeatCapacityRecordControlsProps) => {
  const renderFreeRecordButton = (
                kind: 'u0' | 'u1' | 'u2',
                state: NonNullable<WorkbenchHeatCapacityRecordControlsProps['freeRecordU0ButtonState']>,
              ) => {
                if (!state.visible) return null;
                const suffix = kind === 'u0' ? 'U₀' : kind === 'u1' ? 'U₁' : 'U₂';
                const label = `${state.mode === 'rerecord' ? '重新记录' : '记录'} ${suffix}`;
                return (
                  <button
                    type="button"
                    data-heat-capacity-free-record={kind}
                    onClick={() => recordFreeHeatCapacitySample(kind)}
                  >
                    {renderScientificText(label)}
                  </button>
                );
              };

  return <div className="studio-heat-preview-control-stack" data-heat-capacity-preview-control-stack="true">
                  {activeFile.heatCapacityMode === 'free' && freeRecordControlsVisible ? (
                    <div
                      className="studio-heat-record-controls studio-heat-free-record-controls"
                      data-heat-capacity-free-record-controls="true"
                    >
                      {freeRecordU0ButtonState ? renderFreeRecordButton('u0', freeRecordU0ButtonState) : null}
                      {freeRecordU1ButtonState ? renderFreeRecordButton('u1', freeRecordU1ButtonState) : null}
                      {freeRecordU2ButtonState ? renderFreeRecordButton('u2', freeRecordU2ButtonState) : null}
                    </div>
                  ) : null}
                  {(() => {
                    const guideStep = getHeatCapacityGuideStep(activeFile);
                    const activeRecordKind = guideHeatCapacityActiveFileId === activeFile.id && !autoDemoInteractionLocked
                      ? activeFile.heatCapacityMode !== 'guide'
                        ? guideStep === 'recordU0Required'
                          ? 'u0'
                          : guideStep === 'recordU1Required'
                            ? 'u1'
                            : guideStep === 'recordU2Required'
                              ? 'u2'
                              : null
                        : null
                      : null;
                    const visibleRecordKind = activeFile.heatCapacityMode === 'guide'
                      ? null
                      : activeRecordKind ?? heatCapacityRecordControlsClosing;
                    if (!visibleRecordKind) return null;
                    const label = visibleRecordKind === 'u0'
                      ? heatCapacityRealtimeCopy.recordU0
                      : visibleRecordKind === 'u1'
                        ? heatCapacityRealtimeCopy.recordU1
                        : heatCapacityRealtimeCopy.recordU2;
                    return (
                      <div
                        className={`studio-heat-record-controls ${guideHeatCapacityPulseActive && guideHeatCapacityFocusControlId?.startsWith('record') ? 'studio-heat-record-controls-pulse' : ''} ${!activeRecordKind ? 'studio-heat-record-controls-exiting' : ''}`}
                        data-heat-capacity-record-controls="true"
                      >
                        <button
                          type="button"
                          data-heat-capacity-guided-record={visibleRecordKind}
                          disabled={!activeRecordKind}
                          onClick={() => recordHeatCapacityGuideSample(visibleRecordKind)}
                        >
                          {renderScientificText(label)}
                        </button>
                      </div>
                    );
                  })()}
                </div>;
};
