import {
  calculateHeatCapacityGroupReference,
  type HeatCapacityCalculationGroupReference,
} from '../../domain/heatCapacity/heatCapacityCalculationModel.ts';
import {
  completeHeatCapacityCalculationWorkflow,
  continueHeatCapacityCalculationAnswer,
  createHeatCapacityCalculationWorkflowSession,
  revealHeatCapacityCalculationWorkflowAnswer,
  selectHeatCapacityCalculationAggregate,
  selectHeatCapacityCalculationGroup,
  submitHeatCapacityCalculationStep,
  updateHeatCapacityCalculationDraft,
  type HeatCapacityCalculationWorkflowSession,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  completeHeatCapacityFreeBatchExperiment,
  deriveHeatCapacityFreeBatchProgress,
  shouldStartHeatCapacityFreeBatchCalculation,
  type HeatCapacityFreeBatchState,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  beginHeatCapacityFreeIdealGroupCalculation,
  beginHeatCapacityFreeRealGroupCalculation,
  completeHeatCapacityFreeIdealExperimentGroupCalculation,
  completeHeatCapacityFreeRealExperimentGroup,
  selectCurrentHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  selectActiveHeatCapacityFreeDomain,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return transactHeatCapacityFreeAuthority(
    file,
    (authority) => authority,
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? commitHeatCapacityFreeRuntimeAuthorityTransaction(
        file,
        file.heatCapacityFreeParameterScheme,
      )
    : file
);

const createHeatCapacityCalculationReferenceFromGuideTrial = (
  file: Pick<
    WorkbenchHeatCapacityState,
    | 'heatCapacityGuideTrial'
    | 'heatCapacityGuidePhysicsConfig'
    | 'pressureSensitivityMvPerKPa'
  >,
): HeatCapacityCalculationGroupReference | null => {
  const trial = file.heatCapacityGuideTrial;
  if (!trial?.u0 || !trial.u1 || !trial.u2) return null;
  return calculateHeatCapacityGroupReference({
    u0Mv: trial.u0.displayPressureMv,
    u1Mv: trial.u1.displayPressureMv,
    u2Mv: trial.u2.displayPressureMv,
    atmosphericPressureKPa:
      file.heatCapacityGuidePhysicsConfig.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
  });
};

const createHeatCapacityCalculationReferenceFromFreeTrial = (
  trial: HeatCapacityFreeTrial,
  batch: HeatCapacityFreeBatchState,
): HeatCapacityCalculationGroupReference | null => {
  const snapshot = batch.frozenConfigSnapshot;
  const u0 = trial.u0 ?? trial.automaticU0;
  if (
    !snapshot ||
    !trial.u1 ||
    !trial.u2 ||
    (!u0 && trial.correctedSignals?.u0Source !== 'assumed-zero')
  ) return null;
  return calculateHeatCapacityGroupReference({
    u0Mv: u0?.displayPressureMv ?? 0,
    u1Mv: trial.u1.displayPressureMv,
    u2Mv: trial.u2.displayPressureMv,
    atmosphericPressureKPa: snapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: snapshot.sensor.pressureMvPerKPa,
  });
};

const createGuideOrDemoHeatCapacityCalculationSession = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession | null => {
  const reference = createHeatCapacityCalculationReferenceFromGuideTrial(file);
  const trial = file.heatCapacityGuideTrial;
  if (!reference || !trial) return null;
  return createHeatCapacityCalculationWorkflowSession({
    mode: file.heatCapacityMode === 'demo' ? 'demo' : 'guide',
    groups: [{ trialId: trial.id, reference }],
    theoreticalGamma: file.theoreticalGamma,
    presentation: file.heatCapacityMode === 'demo' ? 'system-readonly' : 'interactive',
    now,
  });
};

const createFreeHeatCapacityCalculationSession = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession | null => {
  const batch = file.heatCapacityFreeRunWorkspace.batch;
  const progress = deriveHeatCapacityFreeBatchProgress(
    batch,
    file.heatCapacityFreeRunWorkspace.trials,
  );
  if (
    batch.targetGroupCount === null ||
    batch.frozenConfigSnapshot === null ||
    batch.experimentCompletedAtMs === null ||
    !progress.allGroupsRecorded
  ) {
    return null;
  }
  const completedTrials = file.heatCapacityFreeRunWorkspace.trials
    .filter((trial) => trial.completedAtMs !== null)
    .slice(0, batch.targetGroupCount);
  const groups = completedTrials.flatMap((trial) => {
    const reference = createHeatCapacityCalculationReferenceFromFreeTrial(trial, batch);
    return reference ? [{ trialId: trial.id, reference }] : [];
  });
  if (groups.length !== batch.targetGroupCount) return null;
  return createHeatCapacityCalculationWorkflowSession({
    mode: 'free',
    groups,
    theoreticalGamma: batch.frozenConfigSnapshot.physics.gamma,
    presentation: 'interactive',
    now,
  });
};

export const getHeatCapacityCalculationSession = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityCalculationWorkflowSession | null => (
  file.heatCapacityMode === 'free'
    ? (() => {
        const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
          file.heatCapacityFreeExperimentGroups,
        );
        if (currentGroup?.scheme === file.heatCapacityFreeParameterScheme) {
          return currentGroup.calculation?.kind === 'real-interactive' ||
              currentGroup.calculation?.kind === 'ideal-interactive'
            ? currentGroup.calculation.session
            : currentGroup.runSeries.batch.calculationSession;
        }
        return selectActiveHeatCapacityFreeDomain(file).batch.calculationSession;
      })()
    : file.heatCapacityMode === 'demo' || file.heatCapacityMode === 'guide'
      ? file.heatCapacityGuideCalculationSession
      : null
);

const updateHeatCapacityCalculationSessionWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  updater: (
    session: HeatCapacityCalculationWorkflowSession,
  ) => HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    const session = file.heatCapacityGuideCalculationSession;
    if (!session) return file;
    const nextSession = updater(session);
    return nextSession === session
      ? file
      : {
          ...file,
          heatCapacityGuideCalculationSession: nextSession,
          updatedAt: now,
        };
  }
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const session = hydratedFile.heatCapacityFreeRunWorkspace.batch.calculationSession;
  if (!session) return file;
  const nextSession = updater(session);
  if (nextSession === session) return file;
  return storeActiveHeatCapacityFreeDomainRuntimeFields({
    ...hydratedFile,
    heatCapacityFreeRunWorkspace: {
      ...hydratedFile.heatCapacityFreeRunWorkspace,
      batch: {
        ...hydratedFile.heatCapacityFreeRunWorkspace.batch,
        calculationSession: nextSession,
      },
    },
    updatedAt: now,
  });
};

export const ensureHeatCapacityCalculationSessionWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (getHeatCapacityCalculationSession(file)) return file;
  if (file.heatCapacityMode !== 'free') {
    const session = createGuideOrDemoHeatCapacityCalculationSession(file, now);
    return session
      ? {
          ...file,
          heatCapacityGuideCalculationSession: session,
          updatedAt: now,
        }
      : file;
  }
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const session = createFreeHeatCapacityCalculationSession(hydratedFile, now);
  if (!session) return file;
  return storeActiveHeatCapacityFreeDomainRuntimeFields({
    ...hydratedFile,
    heatCapacityFreeRunWorkspace: {
      ...hydratedFile.heatCapacityFreeRunWorkspace,
      batch: {
        ...hydratedFile.heatCapacityFreeRunWorkspace.batch,
        calculationSession: session,
      },
    },
    updatedAt: now,
  });
};

export const startHeatCapacityFreeBatchCalculationWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  if (
    !shouldStartHeatCapacityFreeBatchCalculation(
      file.heatCapacityFreeRunWorkspace.batch,
      file.heatCapacityFreeRunWorkspace.trials,
      file.powerOn,
    )
  ) {
    return file;
  }
  const completedBatch = completeHeatCapacityFreeBatchExperiment(
    file.heatCapacityFreeRunWorkspace.batch,
    now,
  );
  let completedFile: WorkbenchHeatCapacityState = {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      batch: completedBatch,
    },
  };
  let groups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    completedFile.heatCapacityFreeExperimentGroups,
    {
      batch: completedBatch,
      trials: completedFile.heatCapacityFreeRunWorkspace.trials,
      traceStore: completedFile.heatCapacityFreeRunWorkspace.traceStore,
    },
  );
  const calculationSession = completedBatch.calculationSession ??
    createFreeHeatCapacityCalculationSession(completedFile, now);
  if (calculationSession === null) {
    return {
      ...completedFile,
      heatCapacityFreeExperimentGroups: groups,
    };
  }
  const batchWithCalculation = {
    ...completedBatch,
    calculationSession,
  };
  completedFile = {
    ...completedFile,
    heatCapacityFreeRunWorkspace: {
      ...completedFile.heatCapacityFreeRunWorkspace,
      batch: batchWithCalculation,
    },
  };
  groups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    groups,
    {
      batch: batchWithCalculation,
      trials: completedFile.heatCapacityFreeRunWorkspace.trials,
      traceStore: completedFile.heatCapacityFreeRunWorkspace.traceStore,
    },
  );
  groups = completedFile.heatCapacityFreeParameterScheme === 'ideal'
    ? beginHeatCapacityFreeIdealGroupCalculation(groups, calculationSession, now)
    : beginHeatCapacityFreeRealGroupCalculation(groups, calculationSession, now);
  return {
    ...completedFile,
    heatCapacityFreeExperimentGroups: groups,
  };
};

export const updateHeatCapacityCalculationDraftWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  fieldId: string,
  draftRaw: string,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  (session) => updateHeatCapacityCalculationDraft(session, fieldId, draftRaw),
  now,
);

export const submitHeatCapacityCalculationStepWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  stepId: string,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  (session) => submitHeatCapacityCalculationStep(session, stepId, now),
  now,
);

export const continueHeatCapacityCalculationAnswerWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  fieldId: string,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  (session) => continueHeatCapacityCalculationAnswer(session, fieldId),
  now,
);

export const revealHeatCapacityCalculationAnswerWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  fieldId: string,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  (session) => revealHeatCapacityCalculationWorkflowAnswer(session, fieldId, now),
  now,
);

export const selectHeatCapacityCalculationGroupWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  groupIndex: number,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  (session) => selectHeatCapacityCalculationGroup(session, groupIndex),
  now,
);

export const selectHeatCapacityCalculationAggregateWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
) => updateHeatCapacityCalculationSessionWorkbenchState(
  file,
  selectHeatCapacityCalculationAggregate,
  now,
);

export const completeHeatCapacityCalculationWorkflowWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const completedFile = updateHeatCapacityCalculationSessionWorkbenchState(
    file,
    (session) => completeHeatCapacityCalculationWorkflow(session, now),
    now,
  );
  if (completedFile.heatCapacityMode !== 'free') return completedFile;
  const session = completedFile.heatCapacityFreeRunWorkspace.batch.calculationSession;
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    completedFile.heatCapacityFreeExperimentGroups,
  );
  if (
    !session ||
    session.status !== 'completed' ||
    (
      currentGroup?.status !== 'awaiting-real-calculation' &&
      currentGroup?.status !== 'awaiting-ideal-calculation'
    )
  ) {
    return completedFile;
  }
  if (currentGroup.scheme === 'ideal') {
    const transactedFile = transactHeatCapacityFreeAuthority(
      completedFile,
      (authority) => ({
        ...authority,
        heatCapacityFreeExperimentGroups:
          completeHeatCapacityFreeIdealExperimentGroupCalculation(
            authority.heatCapacityFreeExperimentGroups,
            session,
            now,
          ),
      }),
      { commitRuntimeScheme: completedFile.heatCapacityFreeParameterScheme },
    );
    return { ...transactedFile, updatedAt: now };
  }
  const review = selectHeatCapacityFreeProcessReview({
    trials: completedFile.heatCapacityFreeRunWorkspace.trials,
    traceStore: completedFile.heatCapacityFreeRunWorkspace.traceStore,
    theoreticalGamma:
      currentGroup.parameterSnapshot?.physics.gamma ??
      completedFile.theoreticalGamma,
    selectedTrialId: completedFile.heatCapacityFreeRunWorkspace.trials[0]?.id ?? null,
    calculationSession: session,
    scoringVersion: currentGroup.scoringVersion,
  });
  const batchScore = review.batchScore;
  if (batchScore?.total === null || batchScore === null) {
    return completedFile;
  }
  const transactedFile = transactHeatCapacityFreeAuthority(
    completedFile,
    (authority) => ({
      ...authority,
      heatCapacityFreeExperimentGroups: completeHeatCapacityFreeRealExperimentGroup(
        authority.heatCapacityFreeExperimentGroups,
        session,
        batchScore,
        now,
      ),
    }),
    { commitRuntimeScheme: completedFile.heatCapacityFreeParameterScheme },
  );
  return { ...transactedFile, updatedAt: now };
};
