import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizePistonPrecisionKnowns, planPistonPrecision, evaluatePistonPrecisionChain, assessPistonPrecision, PISTON_PRECISION_MINIMUM, PISTON_PRECISION_VERSION, type PistonPrecisionObservation } from '../../src/domain/pistonOscillation/pistonOscillationPrecisionModel.ts';
import { createPistonUncertaintyProfile } from '../../src/domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import { advancePistonOscillationPeriodRun, type PistonOscillationDataProcessingSession, type PistonOscillationRawMeasurementRecord } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { createPistonOscillationGasMaterialSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';

const profile = createPistonUncertaintyProfile();
const knowns = normalizePistonPrecisionKnowns({ movingMassKg: 0.048546, cylinderDiameterM: 0.0325, pressurePa: 101325, referenceGamma: 1.4 });
assert.equal(knowns.pressurePa, 101320, 'half-even reading at a 10 Pa step');
assert.equal(knowns.movingMassKg, 0.0485);
let seed = 917203;
const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 2 ** 32);
type Observation = PistonPrecisionObservation & { deltaMs?: number };
const cases: Array<{ knowns: typeof knowns; observations: Observation[]; profile: typeof profile; plan: ReturnType<typeof planPistonPrecision>['plan'] }> = [];
const ranges: Record<string, number[]> = {};
const periodRanges: number[] = [], squaredRanges: number[] = [];
let maxGammaInUc = 0, maxCombinedRelative = 0, escalatedPeriods = 0;
const add = (observations: Observation[], k = knowns) => {
  const { plan, chain, reference } = planPistonPrecision(k, observations, profile);
  assert.ok(plan.verified, `case ${cases.length}: ${JSON.stringify({ observations, k, plan })}`);
  assert.ok(assessPistonPrecision(chain, reference).verified);
  // The chosen plan is stable and re-evaluation uses precisely its public values.
  assert.deepEqual(evaluatePistonPrecisionChain(k, observations, profile, plan), chain);
  for (const [key, digits] of Object.entries(plan.digits)) (ranges[key] ??= []).push(digits);
  for (const item of Object.values(plan.periods)) { periodRanges.push(item.period); squaredRanges.push(item.squared); }
  maxGammaInUc = Math.max(maxGammaInUc, plan.gammaErrorInUc);
  maxCombinedRelative = Math.max(maxCombinedRelative, plan.combinedRelativeError);
  if (Object.values(plan.periods).some(p => p.period > 6)) escalatedPeriods++;
  cases.push({ knowns: k, observations, profile, plan });
};
for (let c = 0; c < 360; c++) {
  const n = 3 + c % 8;
  const lowMm = 20 + Math.floor(random()*20);
  const stepMm = c % 4 === 0 ? 1 : 3 + Math.floor(random()*9);
  const slope = 35 + random()*50;
  const intercept = (random()-.5)*0.003;
  const observations = Array.from({ length: n }, (_, runIndex) => {
    const heightM = (lowMm+runIndex*stepMm)/1000;
    const periodCount = .5 + Math.floor(random()*39)/2;
    const period = Math.sqrt((heightM-intercept)/slope);
    const deltaMs = Math.max(1, Math.round(period*periodCount*1000));
    return { runIndex, heightM, periodCount, deltaMs, periodS: deltaMs/1000/periodCount,
      sampleRateHz: [100, 125, 250, 500, 1000][c % 5] };
  });
  // Quantized readings can coincide or reverse a very narrow span. Those are
  // model/data guards, not a legitimate precision-planning example.
  const ref = evaluatePistonPrecisionChain(knowns, observations, profile);
  if (!Number.isFinite(ref.slope) || ref.slope <= 0) continue;
  add(observations, normalizePistonPrecisionKnowns({ ...knowns, movingMassKg: 0.02 + random()*.08, pressurePa: 85000+random()*25000, referenceGamma: c % 2 ? 1.67 : 1.4 }));
}
// Exactly straight, nearly straight, and intercept cancellation stress cases.
for (const noise of [0, 1e-10, 1e-7, 0.0001, 0.001]) {
  add([.02, .03, .04, .05].map((periodS, runIndex) => ({ runIndex, periodS, heightM: 50*periodS**2 + [1,-1,-1,1][runIndex]*noise, periodCount: 10, sampleRateHz: 1000 })));
}
// Probe both sides of an expanded-uncertainty rounding boundary, as well as
// gamma report boundaries. These synthetic values isolate numerical behaviour.
const boundaryRows = [.03, .035, .04].map((periodS, runIndex) => ({ runIndex, periodS, heightM: [.05,.069,.09][runIndex], periodCount: 10, sampleRateHz: 1000 }));
for (const target of [1.34499999, 1.34500001, 1.3999999, 1.4000001, 1.99499999, 1.99500001]) {
  const g = evaluatePistonPrecisionChain(knowns, boundaryRows, profile).gamma;
  add(boundaryRows, { ...knowns, pressurePa: knowns.pressurePa*g/target });
}
for (const target of [.099499999, .099500001]) {
  let low = 1000, high = 1000000;
  for (let i = 0; i < 70; i++) {
    const pressurePa = (low+high)/2;
    const u = evaluatePistonPrecisionChain({ ...knowns, pressurePa }, boundaryRows, profile).values.combined*profile.coverage;
    if (u > target) low = pressurePa; else high = pressurePa;
  }
  add(boundaryRows, { ...knowns, pressurePa: (low+high)/2 });
}
const overlapRows = (noise: number) => [.02,.03,.04,.05].map((periodS, runIndex) => ({ runIndex, periodS, heightM: 50*periodS**2+[1,-1,-1,1][runIndex]*noise, periodCount: 100, sampleRateHz: 1000 }));
let lowNoise = 0, highNoise = .001;
for (let i = 0; i < 65; i++) {
  const mid = (lowNoise+highNoise)/2;
  const v = evaluatePistonPrecisionChain(knowns, overlapRows(mid), profile).values;
  if (v.slopeA < v.slopeReadout) lowNoise = mid; else highNoise = mid;
}
for (const offset of [-1e-10, 1e-10]) add(overlapRows((lowNoise+highNoise)/2+offset));

const oracle = spawnSync('python', [fileURLToPath(new URL('./helpers/pistonPrecisionDecimalReference.py', import.meta.url))], {
  input: JSON.stringify(cases), encoding: 'utf8', maxBuffer: 16*1024*1024, windowsHide: true,
});
assert.equal(oracle.status, 0, oracle.stderr);
const results = JSON.parse(oracle.stdout);
for (const [index, c] of cases.entries()) {
  const actual = evaluatePistonPrecisionChain(c.knowns, c.observations, profile, c.plan);
  const { reference, rounded } = results[index];
  for (const key of ['expanded', 'result', 'relative'] as const) assert.equal(actual.values[key], Number(reference.values[key]), `80-digit final ${index}/${key}`);
  assert.equal(actual.relativeError, Number(reference.relativeError), `80-digit relative error ${index}`);
  // Independently repeat every rounded exercise, using the earlier submitted
  // results. Tight equality verifies display -> check -> next step continuity.
  for (const key of Object.keys(actual.values) as Array<keyof typeof actual.values>) {
    assert.ok(Math.abs(actual.values[key] - Number(rounded.values[key])) <= Math.max(1e-14, Math.abs(actual.values[key])*1e-11), `80-digit chained exercise ${index}/${key}: ${actual.values[key]} vs ${rounded.values[key]}`);
  }
  const uc = Number(reference.values.combined);
  assert.ok(Math.abs(actual.gamma-Number(reference.gamma))/uc <= .001000001);
  assert.ok(Math.abs(actual.values.combined-uc)/uc <= .001000001);
}
// Removing a retained guard digit must fail at least one documented check.
for (const c of cases.slice(0, 20)) {
  const ref = evaluatePistonPrecisionChain(c.knowns, c.observations, profile);
  for (const [key, digits] of Object.entries(c.plan.digits)) {
    const k = key as keyof typeof PISTON_PRECISION_MINIMUM;
    if (digits === PISTON_PRECISION_MINIMUM[k]) continue;
    const reduced = structuredClone(c.plan); reduced.digits[k]--;
    assert.ok(!assessPistonPrecision(evaluatePistonPrecisionChain(c.knowns, c.observations, profile, reduced), ref).verified, `${key} has an unnecessary guard digit`);
  }
}
// Exercise the actual pre-fit workflow with one of the measured boundary cases.
// Increased precision must reopen the answer, never silently replace its value.
const guardCase = cases.find(c => c.observations.every(o => o.deltaMs !== undefined)
  && Object.values(c.plan.periods).some(p => p.period > 6 || p.squared > 7))!;
assert.ok(guardCase);
const guardRuns = guardCase.observations.map(o => ({
  rawMeasurementRecordId: `guard-${o.runIndex}`, measurementIndex: o.runIndex,
  targetHeightMm: o.heightM * 1000, fitHeightMm: o.heightM * 1000, sampleRateHz: o.sampleRateHz,
  calculationPrecision: { period: 6, squared: 7 },
  selection: { leftEndpoint: { timeS: 0, sampleIndex: 0, ordinal: 0 },
    rightEndpoint: { timeS: o.deltaMs! / 1000, sampleIndex: o.deltaMs, ordinal: o.periodCount * 2 },
    periodCount: o.periodCount },
  answers: { t1: { status: 'correct' }, t2: { status: 'correct' }, period: { status: 'correct', draftRaw: 'old' } },
  batchAttempts: [], result: { t1S: 0, t2S: o.deltaMs! / 1000, periodCount: o.periodCount },
}));
const guardSession = { status: 'period-processing', precisionVersion: PISTON_PRECISION_VERSION,
  activeRunIndex: guardRuns.length - 1, runs: guardRuns, linearFitResult: null, calculationSession: null,
} as unknown as PistonOscillationDataProcessingSession;
const guardRecords = guardRuns.map(_run => ({ experimentContext: null,
  physicsSnapshot: { gasMaterial: createPistonOscillationGasMaterialSnapshot(guardCase.knowns.referenceGamma === 1.4 ? 'air' : 'helium'),
    config: { movingMassKg: guardCase.knowns.movingMassKg, ambientPressurePa: guardCase.knowns.pressurePa } },
})) as unknown as PistonOscillationRawMeasurementRecord[];
const reopened = advancePistonOscillationPeriodRun(guardSession, 123, guardRecords);
assert.equal(reopened.precisionNotice, 'more-digits');
assert.equal(reopened.status, 'period-processing');
for (const run of reopened.runs.slice(reopened.activeRunIndex)) {
  assert.equal(run.result, null);
  assert.equal(run.answers.period.status, 'unresolved');
  assert.ok(run.answers.period.expectedValue! > 0);
  assert.equal(run.answers.t1.status, 'correct');
  assert.equal(run.answers.t2.status, 'correct');
}
// Isolate the cost of earlier period rounding while retaining each validated
// downstream plan. Final reporting boundaries are included in the comparison.
const periodPrecisionFailures = Object.fromEntries([[4,5], [5,6], [6,7]].map(([period, squared]) => [
  `T${period}/T²${squared}`, cases.filter(c => {
    const reduced = structuredClone(c.plan);
    for (const key of Object.keys(reduced.periods)) reduced.periods[Number(key)] = { period, squared };
    return !assessPistonPrecision(evaluatePistonPrecisionChain(c.knowns, c.observations, profile, reduced),
      evaluatePistonPrecisionChain(c.knowns, c.observations, profile)).verified;
  }).length,
]));
console.log(JSON.stringify({ cases: cases.length, escalatedPeriods, maxGammaInUc, maxCombinedRelative, periodPrecisionFailures,
  periods: [Math.min(...periodRanges), Math.max(...periodRanges)], squared: [Math.min(...squaredRanges), Math.max(...squaredRanges)],
  digits: Object.fromEntries(Object.entries(ranges).map(([key, ds]) => [key, [Math.min(...ds), Math.max(...ds)]])) }, null, 2));
