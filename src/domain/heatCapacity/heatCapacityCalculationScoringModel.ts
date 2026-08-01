import {
  validateHeatCapacityCalculationAnswer,
  type HeatCapacityCalculationAnswerSpec,
  type HeatCapacityCalculationValidationResult,
} from './heatCapacityCalculationValidation.ts';

export interface HeatCapacityCalculationScoringConfig {
  baseCreditRatio: number;
  precisionCorrectionCreditRatio?: number;
  revealAfterAttemptCreditRatio?: number;
}

export const DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG = {
  baseCreditRatio: 0.6,
  precisionCorrectionCreditRatio: 0.8,
  revealAfterAttemptCreditRatio: 0.2,
} as const satisfies HeatCapacityCalculationScoringConfig;

export type HeatCapacityCalculationAnswerStatus =
  | 'unresolved'
  | 'correct'
  | 'revealed';

export type HeatCapacityCalculationAttemptOutcome =
  | 'empty'
  | 'invalid'
  | 'incorrect'
  | 'correct';

export interface HeatCapacityCalculationAnswerAttempt {
  sequence: number;
  rawInput: string;
  outcome: HeatCapacityCalculationAttemptOutcome;
  numericCorrect: boolean;
  precisionCorrect: boolean;
  parsedValue: number | null;
}

export interface HeatCapacityCalculationAnswerState {
  status: HeatCapacityCalculationAnswerStatus;
  lastSubmittedRaw: string;
  attempts: HeatCapacityCalculationAnswerAttempt[];
  hasIncorrectValidAttempt: boolean;
  referenceTone: 'success' | 'danger' | null;
  awardedRatio: number | null;
  scoringConfig: HeatCapacityCalculationScoringConfig;
}

export interface HeatCapacityCalculationSubmissionResult {
  state: HeatCapacityCalculationAnswerState;
  validation: HeatCapacityCalculationValidationResult;
  outcome: HeatCapacityCalculationAttemptOutcome;
}

const normalizeScoringConfig = (
  config: HeatCapacityCalculationScoringConfig,
): HeatCapacityCalculationScoringConfig => {
  const normalized = {
    baseCreditRatio: config.baseCreditRatio,
    precisionCorrectionCreditRatio:
      config.precisionCorrectionCreditRatio ??
      DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG.precisionCorrectionCreditRatio,
    revealAfterAttemptCreditRatio:
      config.revealAfterAttemptCreditRatio ??
      DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG.revealAfterAttemptCreditRatio,
  };
  for (const [key, value] of Object.entries(normalized)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${key} must be between 0 and 1.`);
    }
  }
  return normalized;
};

const assertUnresolved = (state: HeatCapacityCalculationAnswerState) => {
  if (state.status !== 'unresolved') {
    throw new Error('A resolved calculation answer cannot be changed.');
  }
};

const getAttemptOutcome = (
  validation: HeatCapacityCalculationValidationResult,
): HeatCapacityCalculationAttemptOutcome => {
  if (validation.parseResult.status === 'empty') return 'empty';
  if (validation.parseResult.status === 'invalid') return 'invalid';
  return validation.correct ? 'correct' : 'incorrect';
};

export const createHeatCapacityCalculationAnswerState = (
  config: HeatCapacityCalculationScoringConfig =
    DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG,
): HeatCapacityCalculationAnswerState => ({
  status: 'unresolved',
  lastSubmittedRaw: '',
  attempts: [],
  hasIncorrectValidAttempt: false,
  referenceTone: null,
  awardedRatio: null,
  scoringConfig: normalizeScoringConfig(config),
});

export const submitHeatCapacityCalculationAnswer = (
  state: HeatCapacityCalculationAnswerState,
  input: {
    rawInput: string;
    expectedValue: number;
    spec: HeatCapacityCalculationAnswerSpec;
  },
): HeatCapacityCalculationSubmissionResult => {
  assertUnresolved(state);
  const validation = validateHeatCapacityCalculationAnswer(
    input.rawInput,
    input.expectedValue,
    input.spec,
  );
  const outcome = getAttemptOutcome(validation);
  const isIncorrectValidAttempt = outcome === 'incorrect';
  const hasIncorrectValidAttempt =
    state.hasIncorrectValidAttempt || isIncorrectValidAttempt;
  const parsedValue = validation.parseResult.status === 'valid'
    ? validation.parseResult.parsed.value
    : null;
  const attempt: HeatCapacityCalculationAnswerAttempt = {
    sequence: state.attempts.length + 1,
    rawInput: input.rawInput,
    outcome,
    numericCorrect: validation.numericCorrect,
    precisionCorrect: validation.precisionCorrect,
    parsedValue,
  };
  const resolved = outcome === 'correct';
  const hasNumericError = state.attempts.some((previousAttempt) => (
    previousAttempt.outcome === 'incorrect' && !previousAttempt.numericCorrect
  )) || (isIncorrectValidAttempt && !validation.numericCorrect);

  return {
    validation,
    outcome,
    state: {
      ...state,
      status: resolved ? 'correct' : 'unresolved',
      lastSubmittedRaw: input.rawInput,
      attempts: [...state.attempts, attempt],
      hasIncorrectValidAttempt,
      referenceTone: resolved ? 'success' : null,
      awardedRatio: resolved
        ? hasIncorrectValidAttempt
          ? hasNumericError
            ? state.scoringConfig.baseCreditRatio
            : state.scoringConfig.precisionCorrectionCreditRatio ??
              DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG.precisionCorrectionCreditRatio
          : 1
        : null,
    },
  };
};

export const revealHeatCapacityCalculationAnswer = (
  state: HeatCapacityCalculationAnswerState,
): HeatCapacityCalculationAnswerState => {
  assertUnresolved(state);
  return {
    ...state,
    status: 'revealed',
    referenceTone: 'danger',
    awardedRatio: state.hasIncorrectValidAttempt
      ? state.scoringConfig.revealAfterAttemptCreditRatio ??
        DEFAULT_HEAT_CAPACITY_CALCULATION_SCORING_CONFIG.revealAfterAttemptCreditRatio
      : 0,
  };
};

export const calculateHeatCapacityCalculationAnswerScore = (
  state: HeatCapacityCalculationAnswerState,
  maximumScore: number,
): number | null => {
  if (!Number.isFinite(maximumScore) || maximumScore < 0) {
    throw new RangeError('maximumScore must be finite and non-negative.');
  }
  return state.awardedRatio === null
    ? null
    : state.awardedRatio * maximumScore;
};
