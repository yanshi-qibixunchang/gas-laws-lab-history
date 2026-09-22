import { formatDecimalPlacesHalfEven, formatSignificantFiguresHalfEven, roundDecimalPlacesHalfEven } from '../calculation/decimalHalfEven.ts';
import { parseNumericAnswerInput, validateNumericAnswer, type NumericAnswerSpec } from '../calculation/numericAnswerValidation.ts';
import type { PistonOscillationCalculationKnownsSnapshot, PistonOscillationLinearFitResultSnapshot, PistonOscillationPeriodRunState } from './pistonOscillationDataProcessingModel.ts';
import { evaluatePistonPrecisionChain, type PistonPrecisionPlan } from './pistonOscillationPrecisionModel.ts';

export const PISTON_UNCERTAINTY_VERSION = 'piston-free-uncertainty-v2' as const;
export const PISTON_LEGACY_UNCERTAINTY_VERSION = 'piston-free-uncertainty-v1' as const;
export const PISTON_UNCERTAINTY_PHASES = ['A', 'B', 'C'] as const;
export type PistonUncertaintyPhase = typeof PISTON_UNCERTAINTY_PHASES[number];
export const PISTON_UNCERTAINTY_FIELDS = {
  A: ['residual', 'slopeA', 'gammaA'],
  B: ['mass', 'diameter', 'gammaB'],
  C: ['combined', 'relative', 'expanded', 'result'],
} as const;
export type PistonUncertaintyExerciseField = typeof PISTON_UNCERTAINTY_FIELDS[PistonUncertaintyPhase][number];
// Internal components remain in the model; only the ten teaching exercises are answers.
export type PistonUncertaintyField = PistonUncertaintyExerciseField | 'pressure' | 'heightScale' | 'timeScale' | 'heightReadout' | 'slopeReadout' | 'slopeSupplement' | 'slopeB';
export const PISTON_UNCERTAINTY_FIELD_ORDER = PISTON_UNCERTAINTY_PHASES.flatMap(phase => [...PISTON_UNCERTAINTY_FIELDS[phase]]);

export interface PistonUncertaintyProfile {
  version: typeof PISTON_UNCERTAINTY_VERSION;
  massLimitKg: number;
  diameterLimitM: number;
  pressureStandardPa: number;
  heightScaleLimit: number;
  timeScaleLimit: number;
  heightStepM: number;
  coverage: number;
}
export const createPistonUncertaintyProfile = (): PistonUncertaintyProfile => ({
  version: PISTON_UNCERTAINTY_VERSION,
  massLimitKg: 0.0006,
  diameterLimitM: 0.0001,
  pressureStandardPa: 100,
  heightScaleLimit: 0.005,
  timeScaleLimit: 0.0001,
  heightStepM: 0.001,
  coverage: 2,
});

export interface PistonUncertaintyAnswer {
  draft: string;
  status: 'unresolved' | 'correct' | 'revealed';
  feedback: 'empty' | 'invalid' | 'numeric-wrong' | 'precision-wrong' | null;
  attempts: Array<{ atMs: number; raw: string; outcome: string }>;
}
export interface PistonUncertaintyCourse {
  version: typeof PISTON_UNCERTAINTY_VERSION;
  profile: PistonUncertaintyProfile;
  fingerprint: string;
  readPhases: PistonUncertaintyPhase[];
  answers: Record<PistonUncertaintyExerciseField, PistonUncertaintyAnswer>;
  resetNotice: boolean;
}
export interface PistonUncertaintyAnalysis {
  precisionPlan: PistonPrecisionPlan;
  intercept: number;
  meanX: number;
  meanY: number;
  area: number;
  fingerprint: string;
  issue: 'invalid-data' | 'time-resolution' | 'precision-boundary' | null;
  n: number;
  q: number;
  sxx: number;
  slope: number;
  gamma: number;
  massKg: number;
  diameterM: number;
  pressurePa: number;
  resultPower: number;
  rows: Array<{ runIndex: number; x: number; y: number; residual: number; periodCount: number; sampleRateHz: number; periodS: number; timeU: number; heightSensitivity: number; periodSensitivity: number }>;
  values: Record<PistonUncertaintyField, number>;
}

const emptyAnswer = (): PistonUncertaintyAnswer => ({ draft: '', status: 'unresolved', feedback: null, attempts: [] });
export const createPistonUncertaintyCourse = (): PistonUncertaintyCourse => ({
  version: PISTON_UNCERTAINTY_VERSION,
  profile: createPistonUncertaintyProfile(),
  fingerprint: '',
  readPhases: [],
  answers: Object.fromEntries(PISTON_UNCERTAINTY_FIELD_ORDER.map(id => [id, emptyAnswer()])) as PistonUncertaintyCourse['answers'],
  resetNotice: false,
});

export const calculatePistonUncertainty = (
  knowns: PistonOscillationCalculationKnownsSnapshot,
  fit: PistonOscillationLinearFitResultSnapshot,
  runs: readonly PistonOscillationPeriodRunState[],
  profile: PistonUncertaintyProfile,
): PistonUncertaintyAnalysis | null => {
  // Obsolete fits must be recalculated through the unified public chain.
  if (!fit.precisionPlan) return null;
  const observations = fit.points.map(p => {
    const run = runs[p.runIndex];
    return { runIndex: p.runIndex, heightM: p.heightM,
      periodS: run?.result ? roundDecimalPlacesHalfEven(run.result.t2S - run.result.t1S, 3) / run.result.periodCount : NaN,
      deltaMs: run?.result ? Math.round(roundDecimalPlacesHalfEven(run.result.t2S - run.result.t1S, 3) * 1000) : undefined,
      periodCount: run?.result?.periodCount ?? 0, sampleRateHz: run?.sampleRateHz ?? 0 };
  });
  const chain = evaluatePistonPrecisionChain(knowns, observations, profile, fit.precisionPlan);
  const invalid = chain.n < 3 || chain.sxx <= 0 || chain.slope <= 0 || knowns.movingMassKg <= 0 || knowns.cylinderDiameterM <= 0 || knowns.pressurePa <= 0
    || chain.rows.some(r => r.periodCount <= 0 || r.sampleRateHz <= 0 || r.x <= 0)
    || Object.values(chain.values).some(v => !Number.isFinite(v));
  const timeDominates = chain.rows.some(r => 2 * r.periodS * r.timeU > 0.2 * Math.sqrt(chain.sxx / chain.n));
  return { ...chain, precisionPlan: fit.precisionPlan,
    fingerprint: JSON.stringify({ version: PISTON_UNCERTAINTY_VERSION, precision: fit.precisionPlan, profile, knowns, observations }),
    massKg: knowns.movingMassKg, diameterM: knowns.cylinderDiameterM, pressurePa: knowns.pressurePa,
    issue: invalid ? 'invalid-data' : timeDominates ? 'time-resolution' : !fit.precisionPlan.verified ? 'precision-boundary' : null };
};

export const pistonUncertaintyReference = (id: PistonUncertaintyField, analysis: PistonUncertaintyAnalysis): string => {
  const value = analysis.values[id];
  if (id === 'result') return analysis.resultPower > 0
    ? `${formatDecimalPlacesHalfEven(value / 10 ** analysis.resultPower, 0)}e${analysis.resultPower}`
    : formatDecimalPlacesHalfEven(value, -analysis.resultPower);
  if (value === 0) return '0';
  return formatSignificantFiguresHalfEven(value, pistonUncertaintyDigits(id, analysis));
};
export const pistonUncertaintyDigits = (id: PistonUncertaintyField, analysis: PistonUncertaintyAnalysis) => id === 'relative' ? 3
  : id === 'expanded' || id === 'result' ? 2 : analysis.precisionPlan.digits[id];
export const validatePistonUncertaintyAnswer = (id: PistonUncertaintyExerciseField, raw: string, analysis: PistonUncertaintyAnalysis): PistonUncertaintyAnswer['feedback'] => {
  const parsed = parseNumericAnswerInput(raw);
  if (parsed.status !== 'valid') return parsed.status;
  const expected = Number(pistonUncertaintyReference(id, analysis));
  if (id === 'result') return parsed.parsed.value !== expected ? 'numeric-wrong'
    : parsed.parsed.lastWrittenDigitPower !== analysis.resultPower ? 'precision-wrong' : null;
  if (expected === 0) return parsed.parsed.value === 0 ? null : 'numeric-wrong';
  const spec: NumericAnswerSpec = { precision: { type: 'significant-figures', digits: pistonUncertaintyDigits(id, analysis) }, tolerance: { type: 'absolute', value: 0 }, roundingMode: 'half-even' };
  const validation = validateNumericAnswer(raw, expected, spec);
  return !validation.numericCorrect ? 'numeric-wrong' : !validation.precisionCorrect ? 'precision-wrong' : null;
};
export const pistonUncertaintyComplete = (course: PistonUncertaintyCourse | undefined) => !course || (
  course.readPhases.length === 3 && PISTON_UNCERTAINTY_FIELD_ORDER.every(id => course.answers[id].status !== 'unresolved')
);
export const pistonSlopeBAvailable = (course: PistonUncertaintyCourse) => course.answers.slopeA.status !== 'unresolved';
export const activePistonUncertaintyPhase = (course: PistonUncertaintyCourse): PistonUncertaintyPhase | null => PISTON_UNCERTAINTY_PHASES.find(phase => !course.readPhases.includes(phase) || PISTON_UNCERTAINTY_FIELDS[phase].some(id => course.answers[id].status === 'unresolved')) ?? null;
export type PistonUncertaintyAction =
  | { kind: 'read'; phase: PistonUncertaintyPhase }
  | { kind: 'edit'; field: PistonUncertaintyExerciseField; value: string }
  | { kind: 'check' | 'reveal'; field: PistonUncertaintyExerciseField };

export const transitionPistonUncertainty = (course: PistonUncertaintyCourse, analysis: PistonUncertaintyAnalysis, action: PistonUncertaintyAction, atMs: number): PistonUncertaintyCourse => {
  if (analysis.issue) return course;
  const phase = activePistonUncertaintyPhase(course);
  if (!phase) return course;
  if (action.kind === 'read') return action.phase === phase && !course.readPhases.includes(phase)
    ? { ...course, readPhases: [...course.readPhases, phase], resetNotice: false } : course;
  const current = PISTON_UNCERTAINTY_FIELDS[phase].find(id => course.answers[id].status === 'unresolved');
  if (!course.readPhases.includes(phase) || action.field !== current) return course;
  const answer = course.answers[current];
  let next: PistonUncertaintyAnswer;
  if (action.kind === 'edit') next = { ...answer, draft: action.value, feedback: null };
  else if (action.kind === 'reveal') {
    if (answer.attempts.length === 0) return course;
    next = { ...answer, draft: pistonUncertaintyReference(current, analysis), status: 'revealed', feedback: null,
      attempts: [...answer.attempts, { atMs, raw: answer.draft, outcome: 'revealed' }] };
  } else {
    const feedback = validatePistonUncertaintyAnswer(current, answer.draft, analysis);
    next = { ...answer, status: feedback ? 'unresolved' : 'correct', feedback,
      attempts: [...answer.attempts, { atMs, raw: answer.draft, outcome: feedback ?? 'correct' }] };
  }
  return { ...course, fingerprint: analysis.fingerprint, answers: { ...course.answers, [current]: next } };
};

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const normalizePistonUncertaintyCourse = (value: unknown, analysis: PistonUncertaintyAnalysis | null): PistonUncertaintyCourse => {
  const fresh = createPistonUncertaintyCourse();
  if (analysis) fresh.fingerprint = analysis.fingerprint;
  if (!isObject(value)) return fresh;
  if (value.version !== PISTON_UNCERTAINTY_VERSION) return { ...fresh, resetNotice: true };
  if (analysis && value.fingerprint !== analysis.fingerprint) return { ...fresh, resetNotice: Boolean(value.fingerprint) };
  if (!analysis || analysis.issue) return fresh;
  let open = true;
  for (const phase of PISTON_UNCERTAINTY_PHASES) {
    if (!open || !Array.isArray(value.readPhases) || !value.readPhases.includes(phase)) break;
    fresh.readPhases.push(phase);
    for (const id of PISTON_UNCERTAINTY_FIELDS[phase]) {
      const answer = isObject(value.answers) ? value.answers[id] : null;
      if (!open || !isObject(answer)) { open = false; continue; }
      const draft = typeof answer.draft === 'string' ? answer.draft : '';
      const attempts = Array.isArray(answer.attempts) ? answer.attempts.flatMap(a => isObject(a) && typeof a.raw === 'string' && typeof a.outcome === 'string' && typeof a.atMs === 'number' && Number.isFinite(a.atMs) ? [{ atMs: a.atMs, raw: a.raw, outcome: a.outcome }] : []) : [];
      const valid = validatePistonUncertaintyAnswer(id, draft, analysis) === null;
      const status = valid && answer.status === 'correct' ? 'correct'
        : valid && answer.status === 'revealed' && attempts.some(a => a.outcome === 'revealed') ? 'revealed' : 'unresolved';
      fresh.answers[id] = { draft, status, attempts, feedback: status === 'unresolved' && attempts.length > 0 ? validatePistonUncertaintyAnswer(id, draft, analysis) : null };
      if (status === 'unresolved') open = false;
    }
  }
  return { ...fresh, resetNotice: value.resetNotice === true };
};
