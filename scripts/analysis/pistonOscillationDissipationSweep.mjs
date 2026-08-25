import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'reference',
  'piston-oscillation-real-data',
  'capstone-piston-oscillation-4runs-1000hz.csv',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'instrument-modeling', 'analysis');
const JSON_OUTPUT_PATH = path.join(
  OUTPUT_DIR,
  'piston-oscillation-dissipation-sweep-2026-08-25.json',
);
const CSV_OUTPUT_PATH = path.join(
  OUTPUT_DIR,
  'piston-oscillation-dissipation-sweep-top-2026-08-25.csv',
);

const R = 8.31446261815324;
const G = 9.80665;
const GAMMA = 1.4;
const CV_MOLAR = R / (GAMMA - 1);
const TEMPERATURE_K = 293.15;
const MASS_KG = 0.0485;
const DIAMETER_M = 0.0325;
const AREA_M2 = Math.PI * DIAMETER_M ** 2 / 4;
const DEAD_HEIGHT_M = 0.008359;
const SAMPLE_RATE_HZ = 1_000;
const SAMPLE_INTERVAL_S = 1 / SAMPLE_RATE_HZ;
const INTEGRATION_STEP_S = 0.0001;
const INTEGRATION_STEPS_PER_SAMPLE = Math.round(
  SAMPLE_INTERVAL_S / INTEGRATION_STEP_S,
);
const SIMULATION_DURATION_S = 0.35;
const COULOMB_REGULARIZATION_SPEED_M_PER_S = 0.002;
const THERMAL_RELAXATION_REFERENCE_EFFECTIVE_HEIGHT_M = 0.05 + DEAD_HEIGHT_M;

const RUN_DEFINITIONS = [
  {
    run: 1,
    heightMm: 50,
    anchorType: 'trough',
    anchorTimeS: 0.010,
    periodS: 0.0305,
    periodCount: 6,
    clearVisibleUntilS: 0.25,
    faintVisibleUntilS: 0.36,
  },
  {
    run: 2,
    heightMm: 40,
    anchorType: 'trough',
    anchorTimeS: 0.009,
    periodS: 0.029,
    periodCount: 4,
    clearVisibleUntilS: 0.25,
    faintVisibleUntilS: 0.28,
  },
  {
    run: 3,
    heightMm: 30,
    anchorType: 'peak',
    anchorTimeS: 0.021,
    periodS: 0.0265,
    periodCount: 4,
    clearVisibleUntilS: 0.18,
    faintVisibleUntilS: 0.23,
  },
  {
    run: 4,
    heightMm: 20,
    anchorType: 'trough',
    anchorTimeS: 0.007,
    periodS: 0.022,
    periodCount: 3,
    clearVisibleUntilS: 0.16,
    faintVisibleUntilS: 0.19,
  },
];

const parseCsv = () => {
  const rows = fs.readFileSync(SOURCE_PATH, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(',').map(Number));
  return RUN_DEFINITIONS.map((definition, runIndex) => {
    const samples = rows.map((row, sampleIndex) => ({
      sampleIndex,
      timeS: row[runIndex * 2],
      pressureKpa: row[runIndex * 2 + 1],
    }));
    const tail = samples.slice(-100);
    const baselineKpa = tail.reduce((sum, sample) => sum + sample.pressureKpa, 0)
      / tail.length;
    const tailVariance = tail.reduce(
      (sum, sample) => sum + (sample.pressureKpa - baselineKpa) ** 2,
      0,
    ) / (tail.length - 1);
    return {
      ...definition,
      samples,
      baselineKpa,
      tailNoiseStandardDeviationKpa: Math.sqrt(tailVariance),
    };
  });
};

const oppositeType = (type) => (type === 'peak' ? 'trough' : 'peak');

const extractPhaseLockedExtrema = (run) => {
  const extrema = [];
  for (let ordinal = 0; ordinal <= run.periodCount * 2; ordinal += 1) {
    const expectedTimeS = run.anchorTimeS + ordinal * run.periodS / 2;
    const type = ordinal % 2 === 0
      ? run.anchorType
      : oppositeType(run.anchorType);
    const windowHalfWidthS = Math.min(0.004, run.periodS * 0.2);
    const candidates = run.samples.filter((sample) => (
      Math.abs(sample.timeS - expectedTimeS) <= windowHalfWidthS
    ));
    const selected = candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      if (type === 'peak') {
        return candidate.pressureKpa > best.pressureKpa ? candidate : best;
      }
      return candidate.pressureKpa < best.pressureKpa ? candidate : best;
    }, null);
    if (!selected) throw new Error(`Missing phase-locked extremum for run ${run.run}.`);
    extrema.push({
      ordinal,
      type,
      sampleIndex: selected.sampleIndex,
      timeS: selected.timeS,
      pressureKpa: selected.pressureKpa,
      deviationKpa: selected.pressureKpa - run.baselineKpa,
    });
  }
  return extrema;
};

const quantizePressureKpa = (pressurePa) => Math.trunc(pressurePa / 10) / 100;

const derivative = (state, model) => {
  const volumeM3 = model.equilibriumVolumeM3 + AREA_M2 * state.displacementM;
  if (volumeM3 <= 0) return null;
  const pressurePa = model.gasAmountMol * R * state.temperatureK / volumeM3;
  const pressureForceN = AREA_M2 * (pressurePa - model.ambientPressurePa);
  const dampingForceN = model.viscousDampingNsPerM * state.velocityMPerS;
  const coulombForceN = model.coulombFrictionN * Math.tanh(
    state.velocityMPerS / COULOMB_REGULARIZATION_SPEED_M_PER_S,
  );
  const temperatureRelaxationKPerS = Number.isFinite(model.thermalRelaxationTimeS)
    ? -(state.temperatureK - TEMPERATURE_K) / model.thermalRelaxationTimeS
    : 0;
  return {
    displacementM: state.velocityMPerS,
    velocityMPerS: (
      pressureForceN
      - MASS_KG * G
      - dampingForceN
      - coulombForceN
    ) / MASS_KG,
    temperatureK: (
      -(GAMMA - 1) * state.temperatureK
        * AREA_M2 * state.velocityMPerS / volumeM3
      + temperatureRelaxationKPerS
    ),
  };
};

const addScaled = (state, change, scale) => ({
  displacementM: state.displacementM + change.displacementM * scale,
  velocityMPerS: state.velocityMPerS + change.velocityMPerS * scale,
  temperatureK: state.temperatureK + change.temperatureK * scale,
});

const integrate = (state, model, dtS) => {
  const k1 = derivative(state, model);
  if (!k1) return null;
  const k2 = derivative(addScaled(state, k1, dtS / 2), model);
  if (!k2) return null;
  const k3 = derivative(addScaled(state, k2, dtS / 2), model);
  if (!k3) return null;
  const k4 = derivative(addScaled(state, k3, dtS), model);
  if (!k4) return null;
  return {
    displacementM: state.displacementM + dtS / 6 * (
      k1.displacementM + 2 * k2.displacementM + 2 * k3.displacementM + k4.displacementM
    ),
    velocityMPerS: state.velocityMPerS + dtS / 6 * (
      k1.velocityMPerS + 2 * k2.velocityMPerS + 2 * k3.velocityMPerS + k4.velocityMPerS
    ),
    temperatureK: state.temperatureK + dtS / 6 * (
      k1.temperatureK + 2 * k2.temperatureK + 2 * k3.temperatureK + k4.temperatureK
    ),
  };
};

const simulate = (run, candidate, releaseAmplitudeMm) => {
  const equilibriumPressurePa = run.baselineKpa * 1_000;
  const ambientPressurePa = equilibriumPressurePa - MASS_KG * G / AREA_M2;
  const equilibriumVolumeM3 = AREA_M2 * (
    run.heightMm / 1_000 + DEAD_HEIGHT_M
  );
  const gasAmountMol = equilibriumPressurePa * equilibriumVolumeM3
    / (R * TEMPERATURE_K);
  const initialDisplacementM = -releaseAmplitudeMm / 1_000;
  const initialVolumeM3 = equilibriumVolumeM3 + AREA_M2 * initialDisplacementM;
  if (initialVolumeM3 <= 0) return null;
  const compressionRatio = equilibriumVolumeM3 / initialVolumeM3;
  let state = {
    displacementM: initialDisplacementM,
    velocityMPerS: 0,
    temperatureK: TEMPERATURE_K * compressionRatio ** (GAMMA - 1),
  };
  const model = {
    ...candidate,
    thermalRelaxationTimeS: Number.isFinite(candidate.thermalRelaxationTimeS)
      ? candidate.thermalRelaxationTimeS * (
        (run.heightMm / 1_000 + DEAD_HEIGHT_M)
        / THERMAL_RELAXATION_REFERENCE_EFFECTIVE_HEIGHT_M
      ) ** (candidate.thermalVolumeExponent ?? 0)
      : Number.POSITIVE_INFINITY,
    equilibriumVolumeM3,
    ambientPressurePa,
    gasAmountMol,
  };
  const sampleCount = Math.round(SIMULATION_DURATION_S * SAMPLE_RATE_HZ) + 1;
  const samples = [];
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const volumeM3 = equilibriumVolumeM3 + AREA_M2 * state.displacementM;
    const pressurePa = gasAmountMol * R * state.temperatureK / volumeM3;
    if (!Number.isFinite(pressurePa) || pressurePa <= 0) return null;
    samples.push({
      sampleIndex,
      timeS: sampleIndex / SAMPLE_RATE_HZ,
      pressureKpa: quantizePressureKpa(pressurePa),
    });
    if (sampleIndex === sampleCount - 1) break;
    for (let substep = 0; substep < INTEGRATION_STEPS_PER_SAMPLE; substep += 1) {
      state = integrate(state, model, INTEGRATION_STEP_S);
      if (!state) return null;
    }
  }
  return samples;
};

const findAlternatingExtrema = (samples) => {
  const candidates = [];
  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    const isPeak = current.pressureKpa >= previous.pressureKpa
      && current.pressureKpa >= next.pressureKpa
      && (current.pressureKpa > previous.pressureKpa
        || current.pressureKpa > next.pressureKpa);
    const isTrough = current.pressureKpa <= previous.pressureKpa
      && current.pressureKpa <= next.pressureKpa
      && (current.pressureKpa < previous.pressureKpa
        || current.pressureKpa < next.pressureKpa);
    if (!isPeak && !isTrough) continue;
    const candidate = { ...current, type: isPeak ? 'peak' : 'trough' };
    const previousCandidate = candidates.at(-1);
    if (previousCandidate?.type === candidate.type) {
      const moreExtreme = candidate.type === 'peak'
        ? candidate.pressureKpa > previousCandidate.pressureKpa
        : candidate.pressureKpa < previousCandidate.pressureKpa;
      if (moreExtreme) candidates[candidates.length - 1] = candidate;
    } else {
      candidates.push(candidate);
    }
  }
  return candidates;
};

const rootMeanSquare = (values) => Math.sqrt(
  values.reduce((sum, value) => sum + value ** 2, 0) / values.length,
);

const scoreSimulation = (run, realExtrema, simulatedSamples) => {
  const allExtrema = findAlternatingExtrema(simulatedSamples);
  const startIndex = allExtrema.findIndex((extremum) => extremum.type === run.anchorType);
  if (startIndex < 0) return null;
  const modelExtrema = allExtrema.slice(startIndex, startIndex + realExtrema.length);
  if (modelExtrema.length !== realExtrema.length) return null;
  const modelStartTimeS = modelExtrema[0].timeS;
  const realStartTimeS = realExtrema[0].timeS;
  const timingErrorsMs = modelExtrema.map((extremum, index) => (
    ((extremum.timeS - modelStartTimeS)
      - (realExtrema[index].timeS - realStartTimeS)) * 1_000
  ));
  const amplitudeErrorsKpa = modelExtrema.map((extremum, index) => (
    (extremum.pressureKpa - run.baselineKpa) - realExtrema[index].deviationKpa
  ));
  const visibleExtrema = allExtrema.slice(startIndex).filter((extremum) => (
    Math.abs(extremum.pressureKpa - run.baselineKpa) >= 0.5
  ));
  const modelVisibleDurationS = visibleExtrema.length > 0
    ? visibleExtrema.at(-1).timeS - modelStartTimeS
    : 0;
  const realClearVisibleDurationS = Math.max(
    0,
    run.clearVisibleUntilS - realStartTimeS,
  );
  const realFaintVisibleDurationS = Math.max(
    realClearVisibleDurationS,
    run.faintVisibleUntilS - realStartTimeS,
  );
  const timingRmseMs = rootMeanSquare(timingErrorsMs);
  const amplitudeRmseKpa = rootMeanSquare(amplitudeErrorsKpa);
  const visibleDurationErrorMs = modelVisibleDurationS < realClearVisibleDurationS
    ? (realClearVisibleDurationS - modelVisibleDurationS) * 1_000
    : modelVisibleDurationS > realFaintVisibleDurationS
      ? (modelVisibleDurationS - realFaintVisibleDurationS) * 1_000
      : 0;
  return {
    timingRmseMs,
    amplitudeRmseKpa,
    visibleDurationErrorMs,
    modelVisibleDurationS,
    realVisibleDurationRangeS: [
      realClearVisibleDurationS,
      realFaintVisibleDurationS,
    ],
    score: timingRmseMs / 1.5
      + amplitudeRmseKpa / 0.75
      + visibleDurationErrorMs / 30,
    modelExtrema: modelExtrema.map((extremum, index) => ({
      type: extremum.type,
      timeFromAnchorS: extremum.timeS - modelStartTimeS,
      pressureDeviationKpa: extremum.pressureKpa - run.baselineKpa,
      realTimeFromAnchorS: realExtrema[index].timeS - realStartTimeS,
      realPressureDeviationKpa: realExtrema[index].deviationKpa,
    })),
  };
};

const evaluateCandidate = (runs, candidate, amplitudeValuesMm) => {
  const runResults = [];
  for (const run of runs) {
    const realExtrema = extractPhaseLockedExtrema(run);
    let best = null;
    for (const releaseAmplitudeMm of amplitudeValuesMm) {
      const simulated = simulate(run, candidate, releaseAmplitudeMm);
      if (!simulated) continue;
      const result = scoreSimulation(run, realExtrema, simulated);
      if (!result) continue;
      const withAmplitude = { ...result, releaseAmplitudeMm };
      if (!best || withAmplitude.score < best.score) best = withAmplitude;
    }
    if (!best) return null;
    runResults.push({
      run: run.run,
      heightMm: run.heightMm,
      baselineKpa: run.baselineKpa,
      ...best,
    });
  }
  return {
    ...candidate,
    score: runResults.reduce((sum, result) => sum + result.score, 0)
      / runResults.length,
    timingRmseMs: rootMeanSquare(runResults.map((result) => result.timingRmseMs)),
    amplitudeRmseKpa: rootMeanSquare(
      runResults.map((result) => result.amplitudeRmseKpa),
    ),
    visibleDurationRmseMs: rootMeanSquare(
      runResults.map((result) => result.visibleDurationErrorMs),
    ),
    runResults,
  };
};

const range = (start, end, step) => {
  const values = [];
  for (let value = start; value <= end + step / 2; value += step) {
    values.push(Number(value.toFixed(8)));
  }
  return values;
};

const runSweep = (runs) => {
  const viscousValues = [0.4, 0.7, 1, 1.3, 1.6, 1.9, 2.2];
  const coulombValues = [0, 0.0025, 0.005, 0.01, 0.02, 0.04, 0.08];
  const thermalValues = [
    Number.POSITIVE_INFINITY,
    0.5,
    0.1,
    0.03,
    0.01,
    0.005,
    0.002,
  ];
  const amplitudesMm = range(2, 10, 0.5);
  const coarse = [];
  for (const viscousDampingNsPerM of viscousValues) {
    for (const coulombFrictionN of coulombValues) {
      for (const thermalRelaxationTimeS of thermalValues) {
        const result = evaluateCandidate(runs, {
          viscousDampingNsPerM,
          coulombFrictionN,
          thermalRelaxationTimeS,
          thermalVolumeExponent: 0,
        }, amplitudesMm);
        if (result) coarse.push(result);
      }
    }
  }
  coarse.sort((left, right) => left.score - right.score);
  const fineSeeds = coarse.slice(0, 8);
  const fineKeys = new Set();
  const fine = [];
  const fineAmplitudesMm = range(2, 10, 0.25);
  for (const seed of fineSeeds) {
    const fineViscousValues = range(
      Math.max(0, seed.viscousDampingNsPerM - 0.3),
      seed.viscousDampingNsPerM + 0.3,
      0.1,
    );
    const frictionStep = seed.coulombFrictionN <= 0.01 ? 0.0025 : 0.005;
    const fineFrictionValues = range(
      Math.max(0, seed.coulombFrictionN - frictionStep * 2),
      seed.coulombFrictionN + frictionStep * 2,
      frictionStep,
    );
    const fineThermalValues = Number.isFinite(seed.thermalRelaxationTimeS)
      ? Array.from(new Set([
        seed.thermalRelaxationTimeS,
        seed.thermalRelaxationTimeS * 0.75,
        seed.thermalRelaxationTimeS * 1.25,
      ].map((value) => Number(value.toPrecision(8)))))
      : [Number.POSITIVE_INFINITY, 1, 0.5];
    for (const viscousDampingNsPerM of fineViscousValues) {
      for (const coulombFrictionN of fineFrictionValues) {
        for (const thermalRelaxationTimeS of fineThermalValues) {
          const key = [
            viscousDampingNsPerM,
            coulombFrictionN,
            thermalRelaxationTimeS,
          ].join('|');
          if (fineKeys.has(key)) continue;
          fineKeys.add(key);
          const result = evaluateCandidate(runs, {
            viscousDampingNsPerM,
            coulombFrictionN,
            thermalRelaxationTimeS,
            thermalVolumeExponent: 0,
          }, fineAmplitudesMm);
          if (result) fine.push(result);
        }
      }
    }
  }
  const focused = [];
  const focusedViscousValues = range(0.7, 1.5, 0.1);
  const focusedFrictionValues = [0, 0.0025, 0.005, 0.01, 0.015, 0.02];
  const focusedThermalValues = [0.02, 0.025, 0.03, 0.04, 0.05, 0.075, 0.1, 0.15];
  for (const viscousDampingNsPerM of focusedViscousValues) {
    for (const coulombFrictionN of focusedFrictionValues) {
      for (const thermalRelaxationTimeS of focusedThermalValues) {
        const result = evaluateCandidate(runs, {
          viscousDampingNsPerM,
          coulombFrictionN,
          thermalRelaxationTimeS,
          thermalVolumeExponent: 0,
        }, fineAmplitudesMm);
        if (result) focused.push(result);
      }
    }
  }
  const volumeScaledThermal = [];
  const volumeScaledViscousValues = range(0.7, 1.4, 0.1);
  const volumeScaledFrictionValues = [0, 0.0025, 0.005, 0.01];
  const volumeScaledThermalValues = [0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.5];
  const thermalVolumeExponents = [0.5, 1];
  for (const viscousDampingNsPerM of volumeScaledViscousValues) {
    for (const coulombFrictionN of volumeScaledFrictionValues) {
      for (const thermalRelaxationTimeS of volumeScaledThermalValues) {
        for (const thermalVolumeExponent of thermalVolumeExponents) {
          const result = evaluateCandidate(runs, {
            viscousDampingNsPerM,
            coulombFrictionN,
            thermalRelaxationTimeS,
            thermalVolumeExponent,
          }, fineAmplitudesMm);
          if (result) volumeScaledThermal.push(result);
        }
      }
    }
  }
  const explicitComparators = [
    { viscousDampingNsPerM: 0.434, coulombFrictionN: 0, thermalRelaxationTimeS: Number.POSITIVE_INFINITY, thermalVolumeExponent: 0 },
    { viscousDampingNsPerM: 1.5, coulombFrictionN: 0, thermalRelaxationTimeS: Number.POSITIVE_INFINITY, thermalVolumeExponent: 0 },
  ].map((candidate) => evaluateCandidate(runs, candidate, fineAmplitudesMm))
    .filter(Boolean);
  const combined = [
    ...coarse,
    ...fine,
    ...focused,
    ...volumeScaledThermal,
    ...explicitComparators,
  ]
    .sort((left, right) => left.score - right.score);
  const bestScore = combined[0].score;
  const nearOptimal = combined.filter((candidate) => candidate.score <= bestScore * 1.05);
  const getRange = (values) => ({
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  });
  const getBest = (predicate) => combined.find(predicate) ?? null;
  return {
    matrix: {
      coarseCombinationCount: viscousValues.length
        * coulombValues.length * thermalValues.length,
      fineCombinationCount: fine.length,
      focusedCombinationCount: focused.length,
      volumeScaledThermalCombinationCount: volumeScaledThermal.length,
      coarseViscousDampingNsPerM: viscousValues,
      coarseCoulombFrictionN: coulombValues,
      coarseThermalRelaxationTimeS: thermalValues.map((value) => (
        Number.isFinite(value) ? value : null
      )),
      coarseEquivalentReleaseAmplitudeMm: amplitudesMm,
    },
    candidates: combined.slice(0, 100),
    comparatorCandidates: explicitComparators,
    bestByModelFamily: {
      unrestricted: combined[0],
      adiabaticNoDryFriction: getBest((candidate) => (
        candidate.thermalRelaxationTimeS === Number.POSITIVE_INFINITY
        && candidate.coulombFrictionN === 0
      )),
      finiteThermalNoDryFriction: getBest((candidate) => (
        Number.isFinite(candidate.thermalRelaxationTimeS)
        && candidate.coulombFrictionN === 0
      )),
      finiteThermalSmallDryFriction: getBest((candidate) => (
        Number.isFinite(candidate.thermalRelaxationTimeS)
        && candidate.coulombFrictionN > 0
        && candidate.coulombFrictionN <= 0.01
      )),
      volumeScaledThermalSmallDryFriction: getBest((candidate) => (
        Number.isFinite(candidate.thermalRelaxationTimeS)
        && candidate.thermalVolumeExponent > 0
        && candidate.coulombFrictionN <= 0.01
      )),
    },
    nearOptimalFivePercent: {
      count: nearOptimal.length,
      scoreThreshold: bestScore * 1.05,
      viscousDampingNsPerM: getRange(nearOptimal.map(
        (candidate) => candidate.viscousDampingNsPerM,
      )),
      coulombFrictionN: getRange(nearOptimal.map(
        (candidate) => candidate.coulombFrictionN,
      )),
      finiteThermalRelaxationTimeS: getRange(nearOptimal
        .map((candidate) => candidate.thermalRelaxationTimeS)
        .filter(Number.isFinite)),
      thermalVolumeExponent: getRange(nearOptimal.map(
        (candidate) => candidate.thermalVolumeExponent ?? 0,
      )),
    },
    bestByThermalFamily: thermalValues.map((thermalRelaxationTimeS) => coarse.find(
      (candidate) => candidate.thermalRelaxationTimeS === thermalRelaxationTimeS,
    )),
    bestByFrictionFamily: coulombValues.map((coulombFrictionN) => coarse.find(
      (candidate) => candidate.coulombFrictionN === coulombFrictionN,
    )),
  };
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const writeOutputs = (runs, sweep) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sourceMetrics = runs.map((run) => ({
    run: run.run,
    heightMm: run.heightMm,
    baselineKpa: run.baselineKpa,
    tailNoiseStandardDeviationKpa: run.tailNoiseStandardDeviationKpa,
    anchorType: run.anchorType,
    anchorTimeS: run.anchorTimeS,
    acceptedPeriodS: run.periodS,
    clearVisibleUntilS: run.clearVisibleUntilS,
    faintVisibleUntilS: run.faintVisibleUntilS,
    phaseLockedExtrema: extractPhaseLockedExtrema(run),
    rawAlternatingExtremaToAcceptedEndpoint: findAlternatingExtrema(run.samples)
      .filter((extremum) => extremum.timeS >= run.anchorTimeS
        && extremum.timeS <= run.anchorTimeS + run.periodS * run.periodCount),
  }));
  const payload = {
    analysisVersion: 'piston-oscillation-dissipation-sweep-v1',
    generatedAt: new Date().toISOString(),
    source: path.relative(ROOT, SOURCE_PATH).replaceAll('\\', '/'),
    fixedParameters: {
      gamma: GAMMA,
      massKg: MASS_KG,
      pistonDiameterM: DIAMETER_M,
      pistonAreaM2: AREA_M2,
      equivalentDeadVolumeHeightM: DEAD_HEIGHT_M,
      sensorSampleRateHz: SAMPLE_RATE_HZ,
      sensorPressureResolutionKpa: 0.01,
      sensorPressureQuantization: 'truncate-toward-zero',
      ambientTemperatureK: TEMPERATURE_K,
      integrationStepS: INTEGRATION_STEP_S,
      coulombRegularizationSpeedMPerS: COULOMB_REGULARIZATION_SPEED_M_PER_S,
      thermalRelaxationReferenceEffectiveHeightM:
        THERMAL_RELAXATION_REFERENCE_EFFECTIVE_HEIGHT_M,
    },
    metricDefinition: {
      timing: 'RMSE of phase-locked extrema times relative to the accepted anchor extremum',
      amplitude: 'RMSE of phase-locked pressure deviations from each run tail baseline',
      visibleDuration: 'distance of the last modeled extremum at or above 0.5 kPa from the user-confirmed clear-to-faint visibility interval; values inside the interval receive no penalty',
      score: 'mean run score: timing/1.5 ms + amplitude/0.75 kPa + visible-duration error/30 ms',
      fittedNuisanceParameter: 'one equivalent release amplitude per real run; it is not interpreted as the recorded t=0 displacement',
    },
    sourceMetrics,
    ...sweep,
  };
  fs.writeFileSync(JSON_OUTPUT_PATH, `${JSON.stringify(payload, (key, value) => (
    value === Number.POSITIVE_INFINITY ? 'adiabatic-no-relaxation' : value
  ), 2)}\n`, 'utf8');

  const headers = [
    'rank',
    'score',
    'viscousDampingNsPerM',
    'coulombFrictionN',
    'thermalRelaxationTimeS',
    'thermalVolumeExponent',
    'timingRmseMs',
    'amplitudeRmseKpa',
    'visibleDurationRmseMs',
    ...runs.flatMap((run) => [
      `run${run.run}ReleaseAmplitudeMm`,
      `run${run.run}VisibleDurationS`,
    ]),
  ];
  const rows = payload.candidates.map((candidate, index) => [
    index + 1,
    candidate.score,
    candidate.viscousDampingNsPerM,
    candidate.coulombFrictionN,
    Number.isFinite(candidate.thermalRelaxationTimeS)
      ? candidate.thermalRelaxationTimeS
      : 'adiabatic-no-relaxation',
    candidate.thermalVolumeExponent ?? 0,
    candidate.timingRmseMs,
    candidate.amplitudeRmseKpa,
    candidate.visibleDurationRmseMs,
    ...candidate.runResults.flatMap((runResult) => [
      runResult.releaseAmplitudeMm,
      runResult.modelVisibleDurationS,
    ]),
  ]);
  fs.writeFileSync(
    CSV_OUTPUT_PATH,
    `${[headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`,
    'utf8',
  );
  return payload;
};

const runs = parseCsv();
const sweep = runSweep(runs);
const payload = writeOutputs(runs, sweep);
const best = payload.candidates[0];
console.log(JSON.stringify({
  outputs: {
    json: path.relative(ROOT, JSON_OUTPUT_PATH),
    csv: path.relative(ROOT, CSV_OUTPUT_PATH),
  },
  matrix: payload.matrix,
  best: {
    score: best.score,
    viscousDampingNsPerM: best.viscousDampingNsPerM,
    coulombFrictionN: best.coulombFrictionN,
    thermalRelaxationTimeS: best.thermalRelaxationTimeS,
    timingRmseMs: best.timingRmseMs,
    amplitudeRmseKpa: best.amplitudeRmseKpa,
    visibleDurationRmseMs: best.visibleDurationRmseMs,
    runResults: best.runResults.map((run) => ({
      run: run.run,
      releaseAmplitudeMm: run.releaseAmplitudeMm,
      modelVisibleDurationS: run.modelVisibleDurationS,
    })),
  },
}, null, 2));
