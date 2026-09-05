import type {
  PistonOscillationDemoPlaybackSnapshot,
} from '../pistonOscillation/pistonOscillationDemoPlaybackChannel.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

export interface WorkbenchPistonOscillationViewInput {
  file: Readonly<WorkbenchFileState>;
  demoPlayback: Readonly<Pick<PistonOscillationDemoPlaybackSnapshot, 'fileId' | 'phase'>>;
  freeSetupRequestedFileId: string | null;
  dataProcessingReviewRequested: boolean;
  processReviewRequested: boolean;
  calculationReviewRequested: boolean;
  processingSuppressedFileId: string | null;
  calculationSuppressedFileId: string | null;
  explorePowerOn: boolean | undefined;
}

// Read only: session references remain authoritative in the file. Transient window
// requests stay in Workbench; deriving this view never resumes or repairs a session.
export const selectWorkbenchPistonOscillationViewState = (
  input: Readonly<WorkbenchPistonOscillationViewInput>,
) => {
  const { file } = input;
  const demoPlaybackPhase = file.kind === 'heatCapacityPistonOscillation'
    && input.demoPlayback.fileId === file.id
    ? input.demoPlayback.phase
    : 'idle';
  const guideSession = file.kind === 'heatCapacityPistonOscillation'
    ? file.pistonOscillationGuideSession
    : null;
  const freeSession = file.kind === 'heatCapacityPistonOscillation'
    ? file.pistonOscillationFreeSession
    : null;
  const freeSelected = freeSession?.status === 'active';
  const freeSetupOpen = file.kind === 'heatCapacityPistonOscillation'
    && input.freeSetupRequestedFileId === file.id
    && (
      freeSession?.status === 'idle'
      || (freeSelected && freeSession.experimentPlan === null)
    );
  const mandatoryDataProcessing = Boolean(
    guideSession?.status === 'active'
    && (guideSession.step === 'periodProcessing' || guideSession.step === 'completionReview')
  );
  const completedDataProcessingReview = Boolean(
    input.dataProcessingReviewRequested
    && (
      (guideSession?.status === 'completed' && guideSession.dataProcessing?.status === 'completed')
      || (freeSelected && freeSession.dataProcessing?.status === 'completed')
    )
  );
  const dataProcessingOpen = Boolean(
    input.processingSuppressedFileId !== file.id
    && (
      (guideSession?.dataProcessing && (mandatoryDataProcessing || completedDataProcessingReview))
      || (
        freeSelected
        && freeSession.dataProcessing
        && freeSession.reacquisition === null
        && (freeSession.dataProcessing.status !== 'completed' || completedDataProcessingReview)
      )
    )
  );
  const processReviewOpen = Boolean(
    input.processReviewRequested
    && freeSelected
    && freeSession.status === 'active'
    && freeSession.dataProcessing?.status === 'completed'
  );
  const expandedRealtime = dataProcessingOpen || processReviewOpen;
  // An active Free session owns calculation selection even when it has no result.
  const calculationSession = freeSelected
    ? freeSession.dataProcessing?.calculationSession ?? null
    : guideSession?.dataProcessing?.calculationSession ?? null;
  const calculationAutoOpen = Boolean(
    (
      (guideSession?.status === 'active' && guideSession.step === 'calculationReady')
      || (
        freeSelected
        && freeSession.reacquisition === null
        && freeSession.dataProcessing?.status === 'calculation-ready'
      )
    )
    && calculationSession
    && calculationSession.status !== 'completed'
  );
  const calculationWindowOpen = Boolean(
    calculationSession
    && input.calculationSuppressedFileId !== file.id
    && (calculationAutoOpen || input.calculationReviewRequested)
  );
  const guideSelected = guideSession?.status === 'active'
    || (guideSession?.status === 'completed' && !guideSession.completionExited);
  const parameterMode = demoPlaybackPhase !== 'idle'
    ? 'demo' as const
    : guideSelected
      ? 'guide' as const
      : freeSelected
        ? 'free' as const
        : 'explore' as const;
  const parameterSidebarAvailable = file.kind === 'heatCapacityPistonOscillation'
    && parameterMode === 'free';
  const powerOn = file.kind === 'heatCapacityPistonOscillation'
    ? demoPlaybackPhase !== 'idle'
      ? false
      : guideSelected
        ? file.pistonOscillationGuideSession.powerOn
        : freeSelected
          ? file.pistonOscillationFreeSession.powerOn
          : input.explorePowerOn ?? false
    : false;

  return {
    demoPlaybackPhase,
    guideSession,
    freeSession,
    freeSelected,
    freeSetupOpen,
    completedDataProcessingReview,
    dataProcessingOpen,
    processReviewOpen,
    expandedRealtime,
    calculationSession,
    calculationWindowOpen,
    guideSelected,
    parameterMode,
    parameterSidebarAvailable,
    powerOn,
  };
};
