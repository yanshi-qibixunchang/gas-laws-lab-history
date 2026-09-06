import { selectActiveHeatCapacityWorkbenchDisplay } from './workbenchHeatCapacityDisplayState.ts';
import { isHeatCapacityPhysicalKernelMode } from './workbenchHeatCapacityInstrumentState.ts';
import { getHeatCapacityFreeDisplayPhase } from './workbenchHeatCapacityFreeAttemptState.ts';
import { getHeatCapacityGuideRecordButtonState } from './workbenchHeatCapacityGuideControlState.ts';
import { type HeatCapacityGuideRecordKind } from '../../domain/heatCapacity/heatCapacityGuideTrialModel.ts';
import { getHeatCapacityFreeRecordButtonState } from './workbenchHeatCapacityFreeRecordState.ts';

export interface deriveWorkbenchHeatPreviewRecordsPorts {
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  guideHeatCapacityActiveFileId: string | null;
  autoDemoInteractionLocked: boolean;
  heatCapacityRealtimeCopy: ReturnType<typeof import('./workbenchHeatCapacityRealtimeCopy.ts').getHeatCapacityRealtimeCopy>;
}

export function deriveWorkbenchHeatPreviewRecords({
  activeFile,
  guideHeatCapacityActiveFileId,
  autoDemoInteractionLocked,
  heatCapacityRealtimeCopy,
}: deriveWorkbenchHeatPreviewRecordsPorts) {
const heatCapacityTeachingCompleted = activeFile.heatCapacityTeachingStatus === 'completed';

const activeHeatCapacityDisplay = selectActiveHeatCapacityWorkbenchDisplay(activeFile);

const activeHeatCapacityUsesPhysicalKernel = isHeatCapacityPhysicalKernelMode(activeFile.heatCapacityMode);

const heatCapacityDisplayPhase = activeHeatCapacityUsesPhysicalKernel
                ? getHeatCapacityFreeDisplayPhase(activeFile)
                : activeFile.heatCapacityPhase;

const guideRecordU0ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u0')
                : null;

const guideRecordU1ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u1')
                : null;

const guideRecordU2ButtonState = activeFile.heatCapacityMode === 'guide'
                ? getHeatCapacityGuideRecordButtonState(activeFile, 'u2')
                : null;

const activeGuideRecordKind: HeatCapacityGuideRecordKind | null =
                guideHeatCapacityActiveFileId === activeFile.id &&
                activeFile.heatCapacityMode === 'guide' &&
                !autoDemoInteractionLocked
                  ? guideRecordU0ButtonState?.visible
                    ? 'u0'
                    : guideRecordU1ButtonState?.visible
                      ? 'u1'
                      : guideRecordU2ButtonState?.visible
                        ? 'u2'
                        : null
                  : null;

const getGuideRecordLabel = (kind: HeatCapacityGuideRecordKind) => (
                kind === 'u0'
                  ? heatCapacityRealtimeCopy.recordU0
                  : kind === 'u1'
                    ? heatCapacityRealtimeCopy.recordU1
                    : heatCapacityRealtimeCopy.recordU2
              );

const freeRecordU0ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u0')
                : null;

const freeRecordU1ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u1')
                : null;

const freeRecordU2ButtonState = activeFile.heatCapacityMode === 'free'
                ? getHeatCapacityFreeRecordButtonState(activeFile, 'u2')
                : null;

const freeRecordControlsVisible = [
                freeRecordU0ButtonState,
                freeRecordU1ButtonState,
                freeRecordU2ButtonState,
              ].some((state) => state?.visible === true);

  return { heatCapacityTeachingCompleted, activeHeatCapacityDisplay, heatCapacityDisplayPhase, activeGuideRecordKind, getGuideRecordLabel, freeRecordU0ButtonState, freeRecordU1ButtonState, freeRecordU2ButtonState, freeRecordControlsVisible };
}
