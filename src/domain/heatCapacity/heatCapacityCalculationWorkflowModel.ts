import {
  calculateDisplayedHeatCapacityBatchStatistics,
  createDisplayedHeatCapacityGroupReference,
} from './heatCapacityCalculationPrecisionModel.ts';
import {
  calculateHeatCapacityBatchStatistics,
  calculateHeatCapacityRelativeErrorPercent,
  type HeatCapacityCalculationBatchStatistics,
  type HeatCapacityCalculationGroupReference,
} from './heatCapacityCalculationModel.ts';
import {
  formatHeatCapacityCalculationReference,
  getHeatCapacityCalculationAnswerSpec,
  HEAT_CAPACITY_STRICT_ANSWER_RULE,
  type HeatCapacityCalculationAnswerKind,
  type HeatCapacityCalculationAnswerRule,
} from './heatCapacityCalculationValidation.ts';
import {
  createHeatCapacityCalculationAnswerState,
  revealHeatCapacityCalculationAnswer,
  submitHeatCapacityCalculationAnswer,
  type HeatCapacityCalculationAnswerState,
  type HeatCapacityCalculationAttemptOutcome,
  type HeatCapacityCalculationScoringConfig,
  DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG,
} from './heatCapacityCalculationScoringModel.ts';

export const HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION = 1 as const;

export type HeatCapacityCalculationWorkflowMode = 'guide' | 'free' | 'demo';
export type HeatCapacityCalculationWorkflowPresentation =
  | 'interactive'
  | 'system-readonly'
  | 'legacy-readonly';
export type HeatCapacityCalculationWorkflowStatus =
  | 'in-progress'
  | 'ready-to-exit'
  | 'completed';
export type HeatCapacityCalculationStepKind =
  | 'correctedVoltages'
  | 'absolutePressures'
  | 'groupGamma'
  | 'guideRelativeError'
  | 'meanGamma'
  | 'sampleStandardDeviation'
  | 'typeAStandardUncertainty'
  | 'batchRelativeError';

export interface HeatCapacityCalculationFieldFeedback {
  outcome: Exclude<HeatCapacityCalculationAttemptOutcome, 'correct'>;
  numericCorrect: boolean;
  precisionCorrect: boolean;
}

export interface HeatCapacityCalculationWorkflowField {
  id: string;
  symbol: string;
  answerKind: HeatCapacityCalculationAnswerKind;
  expectedValue: number;
  draftRaw: string;
  answer: HeatCapacityCalculationAnswerState;
  feedback: HeatCapacityCalculationFieldFeedback | null;
}

export interface HeatCapacityCalculationWorkflowStep {
  id: string;
  kind: HeatCapacityCalculationStepKind;
  fieldIds: string[];
}

export interface HeatCapacityCalculationWorkflowGroup {
  trialId: string;
  reference: HeatCapacityCalculationGroupReference;
  relativeErrorPercent: number;
  fields: HeatCapacityCalculationWorkflowField[];
  steps: HeatCapacityCalculationWorkflowStep[];
}

export interface HeatCapacityCalculationWorkflowAggregate {
  reference: HeatCapacityCalculationBatchStatistics;
  fields: HeatCapacityCalculationWorkflowField[];
  steps: HeatCapacityCalculationWorkflowStep[];
}

export interface HeatCapacityCalculationWorkflowSession {
  version: typeof HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION;
  answerRule?: HeatCapacityCalculationAnswerRule;
  mode: HeatCapacityCalculationWorkflowMode;
  presentation: HeatCapacityCalculationWorkflowPresentation;
  status: HeatCapacityCalculationWorkflowStatus;
  theoreticalGamma: number;
  groups: HeatCapacityCalculationWorkflowGroup[];
  aggregate: HeatCapacityCalculationWorkflowAggregate | null;
  activeGroupIndex: number;
  selectedGroupIndex: number | null;
  aggregateSelected: boolean;
  activeStepId: string | null;
  scoringConfig: HeatCapacityCalculationScoringConfig;
  startedAtMs: number;
  readyToExitAtMs: number | null;
  completedAtMs: number | null;
}

export interface CreateHeatCapacityCalculationWorkflowSessionOptions {
  answerRule?: HeatCapacityCalculationAnswerRule;
  mode: HeatCapacityCalculationWorkflowMode;
  groups: Array<{
    trialId: string;
    reference: HeatCapacityCalculationGroupReference;
  }>;
  theoreticalGamma: number;
  presentation?: HeatCapacityCalculationWorkflowPresentation;
  scoringConfig?: HeatCapacityCalculationScoringConfig;
  now?: number;
}

const createField = (
  id: string,
  symbol: string,
  answerKind: HeatCapacityCalculationAnswerKind,
  expectedValue: number,
  scoringConfig: HeatCapacityCalculationScoringConfig,
  systemResolved: boolean,
): HeatCapacityCalculationWorkflowField => {
  const answer = createHeatCapacityCalculationAnswerState(scoringConfig);
  return {
    id,
    symbol,
    answerKind,
    expectedValue,
    draftRaw: '',
    answer: systemResolved
      ? {
          ...answer,
          status: 'correct',
          referenceTone: null,
          awardedRatio: null,
        }
      : answer,
    feedback: null,
  };
};

const createGroup = (
  input: CreateHeatCapacityCalculationWorkflowSessionOptions['groups'][number],
  theoreticalGamma: number,
  mode: HeatCapacityCalculationWorkflowMode,
  scoringConfig: HeatCapacityCalculationScoringConfig,
  systemResolved: boolean,
): HeatCapacityCalculationWorkflowGroup => {
  const prefix = `group:${input.trialId}`;
  const relativeErrorPercent = calculateHeatCapacityRelativeErrorPercent(
    input.reference.formulaGamma,
    theoreticalGamma,
  );
  if (relativeErrorPercent === null) {
    throw new Error('The group relative error reference is invalid.');
  }
  const fields = [
    createField(
      `${prefix}:u1Prime`,
      'U₁′',
      'correctedVoltage',
      input.reference.u1PrimeMv,
      scoringConfig,
      systemResolved,
    ),
    createField(
      `${prefix}:u2Prime`,
      'U₂′',
      'correctedVoltage',
      input.reference.u2PrimeMv,
      scoringConfig,
      systemResolved,
    ),
    createField(
      `${prefix}:p1`,
      'P₁',
      'absolutePressure',
      input.reference.p1KPa,
      scoringConfig,
      systemResolved,
    ),
    createField(
      `${prefix}:p2`,
      'P₂',
      'absolutePressure',
      input.reference.p2KPa,
      scoringConfig,
      systemResolved,
    ),
    createField(
      `${prefix}:gamma`,
      'γ',
      'gamma',
      input.reference.formulaGamma,
      scoringConfig,
      systemResolved,
    ),
  ];
  const steps: HeatCapacityCalculationWorkflowStep[] = [
    {
      id: `${prefix}:correctedVoltages`,
      kind: 'correctedVoltages',
      fieldIds: [`${prefix}:u1Prime`, `${prefix}:u2Prime`],
    },
    {
      id: `${prefix}:absolutePressures`,
      kind: 'absolutePressures',
      fieldIds: [`${prefix}:p1`, `${prefix}:p2`],
    },
    {
      id: `${prefix}:groupGamma`,
      kind: 'groupGamma',
      fieldIds: [`${prefix}:gamma`],
    },
  ];
  if (mode === 'guide') {
    fields.push(createField(
      `${prefix}:relativeError`,
      'Eᵣ',
      'relativeErrorPercent',
      relativeErrorPercent,
      scoringConfig,
      systemResolved,
    ));
    steps.push({
      id: `${prefix}:guideRelativeError`,
      kind: 'guideRelativeError',
      fieldIds: [`${prefix}:relativeError`],
    });
  }
  return {
    trialId: input.trialId,
    reference: input.reference,
    relativeErrorPercent,
    fields,
    steps,
  };
};

const createAggregate = (
  groups: readonly HeatCapacityCalculationWorkflowGroup[],
  theoreticalGamma: number,
  scoringConfig: HeatCapacityCalculationScoringConfig,
  systemResolved: boolean,
  answerRule: HeatCapacityCalculationAnswerRule,
): HeatCapacityCalculationWorkflowAggregate => {
  const displayedFormulaGammas = groups.map((group) => Number(
    formatHeatCapacityCalculationReference(
      group.reference.formulaGamma,
      getHeatCapacityCalculationAnswerSpec('gamma', answerRule),
    ),
  ));
  const reference = answerRule === HEAT_CAPACITY_STRICT_ANSWER_RULE
    ? calculateDisplayedHeatCapacityBatchStatistics(displayedFormulaGammas, theoreticalGamma)
    : calculateHeatCapacityBatchStatistics(displayedFormulaGammas, theoreticalGamma);
  if (reference === null) {
    throw new Error('The batch statistics reference is invalid.');
  }
  const prefix = 'aggregate';
  return {
    reference,
    fields: [
      createField(
        `${prefix}:meanGamma`,
        'γ̄',
        'meanGamma',
        reference.meanGamma,
        scoringConfig,
        systemResolved,
      ),
      createField(
        `${prefix}:sampleStandardDeviation`,
        's(γ)',
        'sampleStandardDeviation',
        reference.sampleStandardDeviation,
        scoringConfig,
        systemResolved,
      ),
      createField(
        `${prefix}:typeAStandardUncertainty`,
        'uA(γ̄)',
        'typeAStandardUncertainty',
        reference.typeAStandardUncertainty,
        scoringConfig,
        systemResolved,
      ),
      createField(
        `${prefix}:relativeError`,
        'Eᵣ',
        'relativeErrorPercent',
        reference.relativeErrorPercent,
        scoringConfig,
        systemResolved,
      ),
    ],
    steps: [
      {
        id: `${prefix}:meanGamma`,
        kind: 'meanGamma',
        fieldIds: [`${prefix}:meanGamma`],
      },
      {
        id: `${prefix}:sampleStandardDeviation`,
        kind: 'sampleStandardDeviation',
        fieldIds: [`${prefix}:sampleStandardDeviation`],
      },
      {
        id: `${prefix}:typeAStandardUncertainty`,
        kind: 'typeAStandardUncertainty',
        fieldIds: [`${prefix}:typeAStandardUncertainty`],
      },
      {
        id: `${prefix}:batchRelativeError`,
        kind: 'batchRelativeError',
        fieldIds: [`${prefix}:relativeError`],
      },
    ],
  };
};

const allFields = (
  session: HeatCapacityCalculationWorkflowSession,
) => [
  ...session.groups.flatMap((group) => group.fields),
  ...(session.aggregate?.fields ?? []),
];

const getActiveSteps = (
  session: HeatCapacityCalculationWorkflowSession,
) => (
  session.aggregateSelected
    ? session.aggregate?.steps ?? []
    : session.groups[session.activeGroupIndex]?.steps ?? []
);

const isFieldResolved = (field: HeatCapacityCalculationWorkflowField) => (
  field.answer.status !== 'unresolved'
);

const findField = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
) => allFields(session).find((field) => field.id === fieldId) ?? null;

const isStepResolved = (
  session: HeatCapacityCalculationWorkflowSession,
  step: HeatCapacityCalculationWorkflowStep,
) => step.fieldIds.every((fieldId) => {
  const field = findField(session, fieldId);
  return field !== null && isFieldResolved(field);
});

const replaceField = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
  updater: (field: HeatCapacityCalculationWorkflowField) => HeatCapacityCalculationWorkflowField,
): HeatCapacityCalculationWorkflowSession => ({
  ...session,
  groups: session.groups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => field.id === fieldId ? updater(field) : field),
  })),
  aggregate: session.aggregate
    ? {
        ...session.aggregate,
        fields: session.aggregate.fields.map((field) => (
          field.id === fieldId ? updater(field) : field
        )),
      }
    : null,
});

const advanceWorkflow = (
  session: HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession => {
  if (session.status !== 'in-progress') return session;
  const activeSteps = getActiveSteps(session);
  const unresolvedStep = activeSteps.find((step) => !isStepResolved(session, step));
  if (unresolvedStep) {
    return {
      ...session,
      activeStepId: unresolvedStep.id,
    };
  }

  if (!session.aggregateSelected && session.activeGroupIndex < session.groups.length - 1) {
    const activeGroupIndex = session.activeGroupIndex + 1;
    return {
      ...session,
      activeGroupIndex,
      selectedGroupIndex: activeGroupIndex,
      aggregateSelected: false,
      activeStepId: session.groups[activeGroupIndex].steps[0]?.id ?? null,
    };
  }

  if (!session.aggregateSelected && session.aggregate) {
    return {
      ...session,
      selectedGroupIndex: null,
      aggregateSelected: true,
      activeStepId: session.aggregate.steps[0]?.id ?? null,
    };
  }

  return {
    ...session,
    status: 'ready-to-exit',
    activeStepId: null,
    readyToExitAtMs: session.readyToExitAtMs ?? now,
  };
};

export const createHeatCapacityCalculationWorkflowSession = (
  options: CreateHeatCapacityCalculationWorkflowSessionOptions,
): HeatCapacityCalculationWorkflowSession => {
  if (
    options.groups.length === 0 ||
    !Number.isFinite(options.theoreticalGamma) ||
    options.theoreticalGamma <= 0
  ) {
    throw new Error('A calculation workflow requires valid groups and theoretical gamma.');
  }
  if (options.mode === 'guide' && options.groups.length !== 1) {
    throw new Error('Guide calculation requires exactly one group.');
  }
  const presentation = options.presentation ?? 'interactive';
  const scoringConfig = options.scoringConfig ??
    DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG;
  const systemResolved = presentation !== 'interactive';
  const answerRule = options.answerRule ?? HEAT_CAPACITY_STRICT_ANSWER_RULE;
  // The model's theoretical ratio is a reference constant, not a measured
  // intermediate answer (e.g. monatomic gas uses exactly 5/3).
  const theoreticalGamma = options.theoreticalGamma;
  const groups = options.groups.map((group) => createGroup(
    answerRule === HEAT_CAPACITY_STRICT_ANSWER_RULE
      ? { ...group, reference: createDisplayedHeatCapacityGroupReference(group.reference) }
      : group,
    theoreticalGamma,
    options.mode,
    scoringConfig,
    systemResolved,
  ));
  const aggregate = options.mode === 'free'
    ? createAggregate(
        groups,
        theoreticalGamma,
        scoringConfig,
        systemResolved,
        answerRule,
      )
    : null;
  const now = options.now ?? Date.now();
  return {
    version: HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION,
    answerRule,
    mode: options.mode,
    presentation,
    status: systemResolved ? 'completed' : 'in-progress',
    theoreticalGamma,
    groups,
    aggregate,
    activeGroupIndex: 0,
    selectedGroupIndex: 0,
    aggregateSelected: false,
    activeStepId: systemResolved ? null : groups[0].steps[0]?.id ?? null,
    scoringConfig,
    startedAtMs: now,
    readyToExitAtMs: systemResolved ? now : null,
    completedAtMs: systemResolved ? now : null,
  };
};

const hasSameCalculationWorkflowStructure = (
  persisted: HeatCapacityCalculationWorkflowSession,
  canonical: HeatCapacityCalculationWorkflowSession,
) => {
  const sameFields = (
    persistedFields: readonly HeatCapacityCalculationWorkflowField[],
    canonicalFields: readonly HeatCapacityCalculationWorkflowField[],
  ) => (
    persistedFields.length === canonicalFields.length &&
    persistedFields.every((field, index) => {
      const canonicalField = canonicalFields[index];
      return canonicalField !== undefined &&
        field.id === canonicalField.id &&
        field.symbol === canonicalField.symbol &&
        field.answerKind === canonicalField.answerKind;
    })
  );
  const sameSteps = (
    persistedSteps: readonly HeatCapacityCalculationWorkflowStep[],
    canonicalSteps: readonly HeatCapacityCalculationWorkflowStep[],
  ) => (
    persistedSteps.length === canonicalSteps.length &&
    persistedSteps.every((step, index) => {
      const canonicalStep = canonicalSteps[index];
      return canonicalStep !== undefined &&
        step.id === canonicalStep.id &&
        step.kind === canonicalStep.kind &&
        step.fieldIds.length === canonicalStep.fieldIds.length &&
        step.fieldIds.every((fieldId, fieldIndex) => (
          fieldId === canonicalStep.fieldIds[fieldIndex]
        ));
    })
  );
  return persisted.version === canonical.version &&
    persisted.mode === canonical.mode &&
    persisted.presentation === canonical.presentation &&
    persisted.groups.length === canonical.groups.length &&
    persisted.groups.every((group, index) => {
      const canonicalGroup = canonical.groups[index];
      return canonicalGroup !== undefined &&
        group.trialId === canonicalGroup.trialId &&
        sameFields(group.fields, canonicalGroup.fields) &&
        sameSteps(group.steps, canonicalGroup.steps);
    }) &&
    (
      persisted.aggregate === null
        ? canonical.aggregate === null
        : canonical.aggregate !== null &&
          sameFields(persisted.aggregate.fields, canonical.aggregate.fields) &&
          sameSteps(persisted.aggregate.steps, canonical.aggregate.steps)
    );
};

const replayCalculationFieldProgress = (
  persisted: HeatCapacityCalculationWorkflowField,
  canonical: HeatCapacityCalculationWorkflowField,
  answerRule: HeatCapacityCalculationAnswerRule | undefined,
): HeatCapacityCalculationWorkflowField => {
  let answer = createHeatCapacityCalculationAnswerState(
    canonical.answer.scoringConfig,
  );
  let feedback: HeatCapacityCalculationFieldFeedback | null = null;
  for (const attempt of persisted.answer.attempts) {
    if (answer.status !== 'unresolved') break;
    const submission = submitHeatCapacityCalculationAnswer(answer, {
      rawInput: attempt.rawInput,
      expectedValue: canonical.expectedValue,
      spec: getHeatCapacityCalculationAnswerSpec(canonical.answerKind, answerRule),
    });
    answer = submission.state;
    feedback = submission.outcome === 'correct'
      ? null
      : {
          outcome: submission.outcome,
          numericCorrect: submission.validation.numericCorrect,
          precisionCorrect: submission.validation.precisionCorrect,
        };
  }
  if (
    persisted.answer.status === 'revealed' &&
    answer.status === 'unresolved' &&
    feedback !== null
  ) {
    answer = revealHeatCapacityCalculationAnswer(answer);
    feedback = null;
  } else if (
    answer.status === 'unresolved' &&
    persisted.feedback === null
  ) {
    feedback = null;
  }
  const lastAttemptRaw = persisted.answer.attempts.at(-1)?.rawInput;
  const draftRaw = answer.status !== 'unresolved' || feedback !== null
    ? lastAttemptRaw ?? ''
    : persisted.draftRaw;
  return {
    ...canonical,
    draftRaw,
    answer,
    feedback: answer.status === 'unresolved' ? feedback : null,
  };
};

export const rehydrateHeatCapacityCalculationWorkflowSession = (
  persisted: HeatCapacityCalculationWorkflowSession,
  options: CreateHeatCapacityCalculationWorkflowSessionOptions,
): HeatCapacityCalculationWorkflowSession => {
  const canonical = createHeatCapacityCalculationWorkflowSession({
    ...options,
    answerRule: persisted.answerRule ?? 'legacy-tolerance-v1',
  });
  if (!hasSameCalculationWorkflowStructure(persisted, canonical)) {
    return canonical;
  }
  if (canonical.presentation !== 'interactive') {
    const startedAtMs = persisted.startedAtMs;
    const readyToExitAtMs = persisted.readyToExitAtMs !== null &&
      persisted.readyToExitAtMs >= startedAtMs
      ? persisted.readyToExitAtMs
      : startedAtMs;
    const completedAtMs = persisted.completedAtMs !== null &&
      persisted.completedAtMs >= readyToExitAtMs
      ? persisted.completedAtMs
      : readyToExitAtMs;
    return {
      ...canonical,
      startedAtMs,
      readyToExitAtMs,
      completedAtMs,
    };
  }

  const canonicalFieldsById = new Map(
    allFields(canonical).map((field) => [field.id, field] as const),
  );
  const replayedFieldsById = new Map<string, HeatCapacityCalculationWorkflowField>();
  for (const group of persisted.groups) {
    for (const field of group.fields) {
      const canonicalField = canonicalFieldsById.get(field.id);
      if (canonicalField) {
        replayedFieldsById.set(
          field.id,
          replayCalculationFieldProgress(field, canonicalField, canonical.answerRule),
        );
      }
    }
  }
  for (const field of persisted.aggregate?.fields ?? []) {
    const canonicalField = canonicalFieldsById.get(field.id);
    if (canonicalField) {
      replayedFieldsById.set(
        field.id,
        replayCalculationFieldProgress(field, canonicalField, canonical.answerRule),
      );
    }
  }

  let activeGroupIndex = 0;
  let activeStepId: string | null = null;
  let aggregateSelected = false;
  let progressBlocked = false;
  const normalizeSteps = (
    steps: readonly HeatCapacityCalculationWorkflowStep[],
    groupIndex: number | null,
  ) => {
    for (const step of steps) {
      if (progressBlocked) {
        for (const fieldId of step.fieldIds) {
          const canonicalField = canonicalFieldsById.get(fieldId);
          if (canonicalField) replayedFieldsById.set(fieldId, canonicalField);
        }
        continue;
      }
      const unresolved = step.fieldIds.some((fieldId) => (
        replayedFieldsById.get(fieldId)?.answer.status === 'unresolved'
      ));
      if (!unresolved) continue;
      progressBlocked = true;
      activeStepId = step.id;
      aggregateSelected = groupIndex === null;
      if (groupIndex !== null) activeGroupIndex = groupIndex;
    }
  };
  canonical.groups.forEach((group, groupIndex) => {
    normalizeSteps(group.steps, groupIndex);
  });
  if (canonical.aggregate) normalizeSteps(canonical.aggregate.steps, null);

  const groups = canonical.groups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => replayedFieldsById.get(field.id) ?? field),
  }));
  const aggregate = canonical.aggregate
    ? {
        ...canonical.aggregate,
        fields: canonical.aggregate.fields.map((field) => (
          replayedFieldsById.get(field.id) ?? field
        )),
      }
    : null;
  const startedAtMs = persisted.startedAtMs;
  if (activeStepId !== null) {
    return {
      ...canonical,
      groups,
      aggregate,
      status: 'in-progress',
      activeGroupIndex,
      selectedGroupIndex: aggregateSelected ? null : activeGroupIndex,
      aggregateSelected,
      activeStepId,
      startedAtMs,
      readyToExitAtMs: null,
      completedAtMs: null,
    };
  }

  const completedAtMs = persisted.status === 'completed' &&
    persisted.completedAtMs !== null &&
    persisted.completedAtMs >= startedAtMs
    ? persisted.completedAtMs
    : null;
  const readyToExitAtMs = (
    persisted.readyToExitAtMs !== null &&
    persisted.readyToExitAtMs >= startedAtMs &&
    (completedAtMs === null || persisted.readyToExitAtMs <= completedAtMs)
  )
    ? persisted.readyToExitAtMs
    : completedAtMs ?? Math.max(startedAtMs, options.now ?? Date.now());
  return {
    ...canonical,
    groups,
    aggregate,
    status: completedAtMs === null ? 'ready-to-exit' : 'completed',
    activeGroupIndex: Math.max(0, groups.length - 1),
    selectedGroupIndex: aggregate === null ? Math.max(0, groups.length - 1) : null,
    aggregateSelected: aggregate !== null,
    activeStepId: null,
    startedAtMs,
    readyToExitAtMs,
    completedAtMs,
  };
};

export const updateHeatCapacityCalculationDraft = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
  draftRaw: string,
): HeatCapacityCalculationWorkflowSession => {
  if (session.status !== 'in-progress' || session.presentation !== 'interactive') {
    return session;
  }
  const field = findField(session, fieldId);
  if (!field || field.answer.status !== 'unresolved' || field.feedback !== null) {
    return session;
  }
  return replaceField(session, fieldId, (current) => ({
    ...current,
    draftRaw,
  }));
};

export const submitHeatCapacityCalculationStep = (
  session: HeatCapacityCalculationWorkflowSession,
  stepId: string,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession => {
  if (
    session.status !== 'in-progress' ||
    session.presentation !== 'interactive' ||
    session.activeStepId !== stepId
  ) {
    return session;
  }
  const step = getActiveSteps(session).find((candidate) => candidate.id === stepId);
  if (!step) return session;

  let nextSession = session;
  for (const fieldId of step.fieldIds) {
    const field = findField(nextSession, fieldId);
    if (!field || field.answer.status !== 'unresolved' || field.feedback !== null) continue;
    const submission = submitHeatCapacityCalculationAnswer(field.answer, {
      rawInput: field.draftRaw,
      expectedValue: field.expectedValue,
      spec: getHeatCapacityCalculationAnswerSpec(field.answerKind, session.answerRule),
    });
    nextSession = replaceField(nextSession, fieldId, (current) => ({
      ...current,
      answer: submission.state,
      feedback: submission.outcome === 'correct'
        ? null
        : {
            outcome: submission.outcome,
            numericCorrect: submission.validation.numericCorrect,
            precisionCorrect: submission.validation.precisionCorrect,
          },
    }));
  }
  return advanceWorkflow(nextSession, now);
};

export const continueHeatCapacityCalculationAnswer = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
): HeatCapacityCalculationWorkflowSession => {
  if (session.status !== 'in-progress' || session.presentation !== 'interactive') {
    return session;
  }
  const field = findField(session, fieldId);
  if (!field || field.answer.status !== 'unresolved' || field.feedback === null) {
    return session;
  }
  return replaceField(session, fieldId, (current) => ({
    ...current,
    feedback: null,
  }));
};

export const revealHeatCapacityCalculationWorkflowAnswer = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession => {
  if (session.status !== 'in-progress' || session.presentation !== 'interactive') {
    return session;
  }
  const field = findField(session, fieldId);
  if (!field || field.answer.status !== 'unresolved' || field.feedback === null) {
    return session;
  }
  const nextSession = replaceField(session, fieldId, (current) => ({
    ...current,
    answer: revealHeatCapacityCalculationAnswer(current.answer),
    feedback: null,
  }));
  return advanceWorkflow(nextSession, now);
};

export const selectHeatCapacityCalculationGroup = (
  session: HeatCapacityCalculationWorkflowSession,
  groupIndex: number,
): HeatCapacityCalculationWorkflowSession => {
  if (
    !Number.isInteger(groupIndex) ||
    groupIndex < 0 ||
    groupIndex >= session.groups.length ||
    groupIndex > session.activeGroupIndex
  ) {
    return session;
  }
  return {
    ...session,
    selectedGroupIndex: groupIndex,
    aggregateSelected: false,
  };
};

export const selectHeatCapacityCalculationAggregate = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityCalculationWorkflowSession => (
  session.aggregate === null ||
  (
    session.status === 'in-progress' &&
    !session.aggregateSelected
  )
    ? session
    : {
        ...session,
        selectedGroupIndex: null,
        aggregateSelected: true,
      }
);

export const completeHeatCapacityCalculationWorkflow = (
  session: HeatCapacityCalculationWorkflowSession,
  now = Date.now(),
): HeatCapacityCalculationWorkflowSession => (
  session.status !== 'ready-to-exit'
    ? session
    : {
        ...session,
        status: 'completed',
        completedAtMs: session.completedAtMs ?? now,
      }
);

export const getHeatCapacityCalculationWorkflowField = (
  session: HeatCapacityCalculationWorkflowSession,
  fieldId: string,
) => findField(session, fieldId);

export const getHeatCapacityCalculationWorkflowVisibleSteps = (
  session: HeatCapacityCalculationWorkflowSession,
): HeatCapacityCalculationWorkflowStep[] => {
  const selectedSteps = session.aggregateSelected
    ? session.aggregate?.steps ?? []
    : session.groups[session.selectedGroupIndex ?? 0]?.steps ?? [];
  if (session.status !== 'in-progress') return selectedSteps;
  const activeIndex = selectedSteps.findIndex((step) => step.id === session.activeStepId);
  if (
    session.aggregateSelected ||
    session.selectedGroupIndex === session.activeGroupIndex
  ) {
    return activeIndex >= 0
      ? selectedSteps.slice(0, activeIndex + 1)
      : selectedSteps;
  }
  return selectedSteps;
};

export const calculateHeatCapacityCalculationWorkflowScoreRatio = (
  session: HeatCapacityCalculationWorkflowSession,
): number | null => {
  if (session.mode !== 'free' || session.presentation !== 'interactive') return null;
  const fields = allFields(session);
  if (fields.length === 0 || fields.some((field) => field.answer.awardedRatio === null)) {
    return null;
  }
  return fields.reduce((sum, field) => sum + (field.answer.awardedRatio ?? 0), 0) /
    fields.length;
};
