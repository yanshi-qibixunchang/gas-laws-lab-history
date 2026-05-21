import {
  calculateFreeHeatCapacityTrialSignals,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecord,
  type HeatCapacityFreeTrial,
} from './heatCapacityFreeTrialModel.ts';
import type {
  HeatCapacityFreeTraceBranch,
  HeatCapacityFreeTraceSample,
  HeatCapacityFreeTraceTrial,
} from './heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityBestRecordWindow,
  HeatCapacityOperationUpperBound,
  HeatCapacityProcessRecordId,
} from './heatCapacityFreeProcessReviewTypes.ts';

const WINDOW_HALF_WIDTH_S = 1;

const roundNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const pressureMvToKPa = (
  displayPressureMv: number,
  u0DisplayPressureMv: number,
  traceTrial: HeatCapacityFreeTraceTrial,
) => (
  (displayPressureMv - u0DisplayPressureMv) /
  traceTrial.configSnapshot.sensor.pressureMvPerKPa
);

const temperatureMvToK = (
  displayTemperatureMv: number,
  u0DisplayTemperatureMv: number,
  traceTrial: HeatCapacityFreeTraceTrial,
) => (
  (displayTemperatureMv - u0DisplayTemperatureMv) /
  traceTrial.configSnapshot.sensor.temperatureMvPerK
);

const sampleCorrectedPressureMv = (
  sample: HeatCapacityFreeTraceSample,
  u0DisplayPressureMv: number,
) => sample.sensor.displayPressureMv - u0DisplayPressureMv;

const sampleIsStable = (sample: HeatCapacityFreeTraceSample) => (
  sample.stability.pressureStable &&
  sample.stability.temperatureStable &&
  Math.abs(sample.sensor.pressureSlopeMvPerS) <= 0.3 &&
  Math.abs(sample.sensor.temperatureSlopeMvPerS) <= 0.15
);

const createWindowFromSample = (
  recordId: HeatCapacityProcessRecordId,
  sample: HeatCapacityFreeTraceSample,
  traceTrial: HeatCapacityFreeTraceTrial,
  u0DisplayPressureMv: number,
  u0DisplayTemperatureMv: number,
  qualityScore: number,
  reason: string,
): HeatCapacityBestRecordWindow => ({
  recordId,
  startS: roundNumber(Math.max(0, sample.atS - WINDOW_HALF_WIDTH_S), 2),
  endS: roundNumber(sample.atS + WINDOW_HALF_WIDTH_S, 2),
  recommendedSampleId: sample.id,
  recommendedTimeS: roundNumber(sample.atS, 2),
  displayPressureMv: roundNumber(sample.sensor.displayPressureMv, 2),
  displayTemperatureMv: roundNumber(sample.sensor.displayTemperatureMv, 2),
  pressureDeltaKPa: roundNumber(pressureMvToKPa(sample.sensor.displayPressureMv, u0DisplayPressureMv, traceTrial), 3),
  temperatureDeltaK: roundNumber(temperatureMvToK(sample.sensor.displayTemperatureMv, u0DisplayTemperatureMv, traceTrial), 3),
  qualityScore: roundNumber(Math.max(0, Math.min(100, qualityScore)), 1),
  source: 'trace',
  reason,
});

const createWindowFromRecord = (
  recordId: HeatCapacityProcessRecordId,
  record: HeatCapacityFreeRecord | null,
  traceTrial: HeatCapacityFreeTraceTrial,
  u0DisplayPressureMv: number,
  u0DisplayTemperatureMv: number,
  reason: string,
): HeatCapacityBestRecordWindow => ({
  recordId,
  startS: roundNumber(Math.max(0, (record?.atS ?? 0) - WINDOW_HALF_WIDTH_S), 2),
  endS: roundNumber((record?.atS ?? 0) + WINDOW_HALF_WIDTH_S, 2),
  recommendedSampleId: record?.traceSampleId ?? null,
  recommendedTimeS: record?.atS === undefined ? null : roundNumber(record.atS, 2),
  displayPressureMv: record?.displayPressureMv === undefined ? null : roundNumber(record.displayPressureMv, 2),
  displayTemperatureMv: record?.displayTemperatureMv === undefined ? null : roundNumber(record.displayTemperatureMv, 2),
  pressureDeltaKPa: record?.displayPressureMv === undefined
    ? null
    : roundNumber(pressureMvToKPa(record.displayPressureMv, u0DisplayPressureMv, traceTrial), 3),
  temperatureDeltaK: record?.displayTemperatureMv === undefined
    ? null
    : roundNumber(temperatureMvToK(record.displayTemperatureMv, u0DisplayTemperatureMv, traceTrial), 3),
  qualityScore: record ? 30 : 0,
  source: 'trace',
  reason,
});

const createAutomaticU0Window = (
  trial: HeatCapacityFreeTrial,
  traceTrial: HeatCapacityFreeTraceTrial,
): HeatCapacityBestRecordWindow | null => {
  if (!trial.automaticU0) return null;
  return {
    recordId: 'u0',
    startS: roundNumber(Math.max(0, trial.automaticU0.atS - WINDOW_HALF_WIDTH_S), 2),
    endS: roundNumber(trial.automaticU0.atS + WINDOW_HALF_WIDTH_S, 2),
    recommendedSampleId: null,
    recommendedTimeS: roundNumber(trial.automaticU0.atS, 2),
    displayPressureMv: roundNumber(trial.automaticU0.displayPressureMv, 2),
    displayTemperatureMv: roundNumber(trial.automaticU0.displayTemperatureMv, 2),
    pressureDeltaKPa: roundNumber(
      trial.automaticU0.displayPressureMv / traceTrial.configSnapshot.sensor.pressureMvPerKPa,
      3,
    ),
    temperatureDeltaK: roundNumber(
      (trial.automaticU0.displayTemperatureMv - traceTrial.configSnapshot.sensor.temperatureMvAtAmbient) /
        traceTrial.configSnapshot.sensor.temperatureMvPerK,
      3,
    ),
    qualityScore: 70,
    source: 'automatic-u0',
    reason: '自动 U0 候选可作为零点窗口数据基础。',
  };
};

const sortByQuality = (left: HeatCapacityBestRecordWindow, right: HeatCapacityBestRecordWindow) => (
  right.qualityScore - left.qualityScore ||
  (left.recommendedTimeS ?? 0) - (right.recommendedTimeS ?? 0)
);

const uniqueWindows = (
  windows: HeatCapacityBestRecordWindow[],
) => {
  const seen = new Set<string>();
  const unique: HeatCapacityBestRecordWindow[] = [];
  for (const window of windows) {
    const key = [
      window.recordId,
      window.recommendedSampleId ?? 'record',
      window.recommendedTimeS ?? 'none',
      window.displayPressureMv ?? 'none',
      window.displayTemperatureMv ?? 'none',
    ].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(window);
  }
  return unique;
};

const selectBestU0Window = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
) => {
  const candidates = branch.samples
    .filter((sample) => (
      sample.controls.powerOn &&
      sample.controls.stopcockOpen &&
      sampleIsStable(sample) &&
      Math.abs(sample.sensor.displayPressureMv) <= 2
    ))
    .map((sample) => createWindowFromSample(
      'u0',
      sample,
      traceTrial,
      sample.sensor.displayPressureMv,
      sample.sensor.displayTemperatureMv,
      95 - Math.abs(sample.sensor.displayPressureMv) * 12,
      '开塞调零后的稳定零点读数。',
    ))
    .sort(sortByQuality);
  return candidates[0] ??
    createAutomaticU0Window(trial, traceTrial) ??
    createWindowFromRecord(
      'u0',
      trial.u0,
      traceTrial,
      trial.u0?.displayPressureMv ?? 0,
      trial.u0?.displayTemperatureMv ?? traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
      '未找到更优稳定零点样本，沿用实际 U0 记录。',
    );
};

const findReleaseStartS = (
  branch: HeatCapacityFreeTraceBranch,
  afterS: number,
) => branch.events.find((event) => (
  event.type === 'stopcock-open' &&
  event.atS > afterS
))?.atS ?? Number.POSITIVE_INFINITY;

const isOfficialRecordSample = (
  sample: HeatCapacityFreeTraceSample,
  trial: HeatCapacityFreeTrial,
  recordId: Exclude<HeatCapacityProcessRecordId, 'u0'>,
) => (
  recordId === 'u1'
    ? sample.id === trial.u1?.traceSampleId
    : sample.id === trial.u2?.traceSampleId
);

const selectBestU1Windows = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
) => {
  const u0Pressure = u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0;
  const u0Temperature = u0.displayTemperatureMv ??
    trial.u0?.displayTemperatureMv ??
    traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
  const releaseStartS = findReleaseStartS(branch, trial.u1?.atS ?? 0);
  const minimum = traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv;
  const danger = traceTrial.configSnapshot.record.pressureDangerMv;
  const candidates = branch.samples
    .filter((sample) => {
      const correctedPressureMv = sampleCorrectedPressureMv(sample, u0Pressure);
      return sample.atS <= releaseStartS &&
        sample.controls.powerOn &&
        !sample.controls.stopcockOpen &&
        !sample.controls.pumpValveOpen &&
        !isOfficialRecordSample(sample, trial, 'u1') &&
        sampleIsStable(sample) &&
        correctedPressureMv >= minimum &&
        correctedPressureMv < danger;
    })
    .map((sample) => {
      const correctedPressureMv = sampleCorrectedPressureMv(sample, u0Pressure);
      const pressureRangeScore = 30 * Math.min(1, correctedPressureMv / Math.max(1, danger * 0.85));
      const dangerMarginScore = 15 * Math.max(0, (danger - correctedPressureMv) / Math.max(1, danger - minimum));
      const ambientTemperatureMv = traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
      const temperatureScore = Math.max(
        0,
        20 - Math.abs(sample.sensor.displayTemperatureMv - ambientTemperatureMv) * 4,
      );
      return createWindowFromSample(
        'u1',
        sample,
        traceTrial,
        u0Pressure,
        u0Temperature,
        35 + pressureRangeScore + dangerMarginScore + temperatureScore,
        '封闭且稳定的高压读数，未进入报警区。',
      );
    })
    .sort(sortByQuality);
  if (candidates.length > 0) return uniqueWindows(candidates.slice(0, 24));
  return [
    createWindowFromRecord(
      'u1',
      trial.u1,
      traceTrial,
      u0Pressure,
      u0Temperature,
      '未找到独立 U1 稳定样本，沿用实际 U1 记录作为兜底。',
    ),
  ];
};

const selectBestU1Window = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
) => selectBestU1Windows(traceTrial, branch, trial, u0)[0] ?? createWindowFromRecord(
  'u1',
  trial.u1,
  traceTrial,
  u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0,
  u0.displayTemperatureMv ??
    trial.u0?.displayTemperatureMv ??
    traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
  'No better stable U1 sample found; using recorded U1.',
);

const selectBestU2Windows = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
  u1: HeatCapacityBestRecordWindow,
) => {
  const u0Pressure = u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0;
  const u0Temperature = u0.displayTemperatureMv ??
    trial.u0?.displayTemperatureMv ??
    traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
  const releaseStartS = findReleaseStartS(branch, trial.u1?.atS ?? 0);
  const u1PressureMv = (u1.displayPressureMv ?? trial.u1?.displayPressureMv ?? 0) - u0Pressure;
  const minimum = traceTrial.configSnapshot.record.overVentedMinimumU2CorrectedMv;
  const candidates = branch.samples
    .filter((sample) => {
      const correctedPressureMv = sampleCorrectedPressureMv(sample, u0Pressure);
      return sample.atS >= releaseStartS &&
        sample.controls.powerOn &&
        !sample.controls.stopcockOpen &&
        !sample.controls.pumpValveOpen &&
        !isOfficialRecordSample(sample, trial, 'u2') &&
        sampleIsStable(sample) &&
        correctedPressureMv > minimum &&
        correctedPressureMv < u1PressureMv;
    })
    .map((sample) => {
      const correctedPressureMv = sampleCorrectedPressureMv(sample, u0Pressure);
      const ratio = u1PressureMv > 0 ? correctedPressureMv / u1PressureMv : 0;
      const ratioScore = ratio >= 0.12 && ratio <= 0.55
        ? 30
        : Math.max(0, 30 - Math.abs(ratio - 0.28) * 80);
      const ambientTemperatureMv = traceTrial.configSnapshot.sensor.temperatureMvAtAmbient;
      const temperatureScore = Math.max(
        0,
        20 - Math.abs(sample.sensor.displayTemperatureMv - ambientTemperatureMv) * 6,
      );
      return createWindowFromSample(
        'u2',
        sample,
        traceTrial,
        u0Pressure,
        u0Temperature,
        35 + ratioScore + temperatureScore,
        '放气后封闭且稳定的回温读数。',
      );
    })
    .sort(sortByQuality);
  if (candidates.length > 0) return uniqueWindows(candidates.slice(0, 24));
  return [
    createWindowFromRecord(
      'u2',
      trial.u2,
      traceTrial,
      u0Pressure,
      u0Temperature,
      '未找到独立 U2 稳定样本，沿用实际 U2 记录作为兜底。',
    ),
  ];
};

const selectBestU2Window = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
  u1: HeatCapacityBestRecordWindow,
) => selectBestU2Windows(traceTrial, branch, trial, u0, u1)[0] ?? createWindowFromRecord(
  'u2',
  trial.u2,
  traceTrial,
  u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0,
  u0.displayTemperatureMv ??
    trial.u0?.displayTemperatureMv ??
    traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
  'No better stable U2 sample found; using recorded U2.',
);

const createUpperBoundRecord = (
  recordId: HeatCapacityProcessRecordId,
  window: HeatCapacityBestRecordWindow,
  trial: HeatCapacityFreeTrial,
): HeatCapacityFreeRecord | null => {
  if (
    window.displayPressureMv === null ||
    window.displayTemperatureMv === null ||
    window.recommendedTimeS === null
  ) {
    return null;
  }
  const original = recordId === 'u0'
    ? trial.u0
    : recordId === 'u1'
      ? trial.u1
      : trial.u2;
  return normalizeHeatCapacityFreeRecordInput({
    atS: window.recommendedTimeS,
    displayPressureMv: window.displayPressureMv,
    displayTemperatureMv: window.displayTemperatureMv,
    calibrationVersion: original?.calibrationVersion ?? trial.u0?.calibrationVersion ?? 0,
    zeroEventId: original?.zeroEventId ?? trial.u0?.zeroEventId ?? 'upper-bound-zero',
    phaseAtRecord: original?.phaseAtRecord ?? null,
    traceTrialId: trial.traceTrialId,
    traceBranchId: original?.traceBranchId ?? null,
    traceSampleId: window.recommendedSampleId,
    eventId: original?.eventId ?? null,
  });
};

const calculateUpperBoundGamma = (
  traceTrial: HeatCapacityFreeTraceTrial,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
  u1: HeatCapacityBestRecordWindow,
  u2: HeatCapacityBestRecordWindow,
) => {
  const syntheticTrial: HeatCapacityFreeTrial = {
    ...trial,
    u0: createUpperBoundRecord('u0', u0, trial),
    u1: createUpperBoundRecord('u1', u1, trial),
    u2: createUpperBoundRecord('u2', u2, trial),
  };
  return calculateFreeHeatCapacityTrialSignals(syntheticTrial, {
    atmosphericPressureKPa: traceTrial.configSnapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: traceTrial.configSnapshot.sensor.pressureMvPerKPa,
  })?.gamma ?? null;
};

const selectBestRecordCombination = (
  traceTrial: HeatCapacityFreeTraceTrial,
  trial: HeatCapacityFreeTrial,
  u0: HeatCapacityBestRecordWindow,
  u1Candidates: HeatCapacityBestRecordWindow[],
  u2Candidates: HeatCapacityBestRecordWindow[],
  theoreticalGamma: number,
  actualGamma: number | null,
) => {
  let best: {
    u1: HeatCapacityBestRecordWindow;
    u2: HeatCapacityBestRecordWindow;
    gamma: number;
    penalty: number;
  } | null = null;
  const actualPenalty = actualGamma === null
    ? null
    : Math.abs(actualGamma - theoreticalGamma);
  const tolerance = 0.000001;
  for (const u1 of u1Candidates) {
    for (const u2 of u2Candidates) {
      const gamma = calculateUpperBoundGamma(traceTrial, trial, u0, u1, u2);
      if (gamma === null || !Number.isFinite(gamma)) continue;
      const gammaPenalty = Math.abs(gamma - theoreticalGamma);
      if (actualGamma !== null && actualPenalty !== null) {
        const worseThanActual = gammaPenalty > actualPenalty + tolerance;
        const movesBelowActual = actualGamma < theoreticalGamma && gamma < actualGamma - tolerance;
        const movesAboveActual = actualGamma > theoreticalGamma && gamma > actualGamma + tolerance;
        if (worseThanActual || movesBelowActual || movesAboveActual) continue;
      }
      const qualityPenalty = (200 - u1.qualityScore - u2.qualityScore) / 100000;
      const penalty = gammaPenalty + qualityPenalty;
      if (!best || penalty < best.penalty) {
        best = { u1, u2, gamma, penalty };
      }
    }
  }
  return best;
};

export const selectHeatCapacityBestRecordWindows = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma = 1.4,
): HeatCapacityOperationUpperBound => {
  const u0 = selectBestU0Window(traceTrial, branch, trial);
  const fallbackU1 = selectBestU1Window(traceTrial, branch, trial, u0);
  const u1Candidates = selectBestU1Windows(traceTrial, branch, trial, u0);
  const u2Candidates = selectBestU2Windows(traceTrial, branch, trial, u0, fallbackU1);
  const actualGamma = trial.correctedSignals?.gamma ?? null;
  const combination = selectBestRecordCombination(
    traceTrial,
    trial,
    u0,
    u1Candidates,
    u2Candidates,
    theoreticalGamma,
    actualGamma,
  );
  const recordFallbackU1 = createWindowFromRecord(
    'u1',
    trial.u1,
    traceTrial,
    u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0,
    u0.displayTemperatureMv ??
      trial.u0?.displayTemperatureMv ??
      traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
    '未找到比本次记录更优的独立 U1 / U2 组合，沿用实际 U1 记录作为兜底。',
  );
  const recordFallbackU2 = createWindowFromRecord(
    'u2',
    trial.u2,
    traceTrial,
    u0.displayPressureMv ?? trial.u0?.displayPressureMv ?? 0,
    u0.displayTemperatureMv ??
      trial.u0?.displayTemperatureMv ??
      traceTrial.configSnapshot.sensor.temperatureMvAtAmbient,
    '未找到比本次记录更优的独立 U1 / U2 组合，沿用实际 U2 记录作为兜底。',
  );
  const u1 = combination?.u1 ?? (actualGamma === null ? fallbackU1 : recordFallbackU1);
  const u2 = combination?.u2 ?? (
    actualGamma === null ? selectBestU2Window(traceTrial, branch, trial, u0, u1) : recordFallbackU2
  );
  const gamma = combination?.gamma ?? (
    actualGamma ?? calculateUpperBoundGamma(traceTrial, trial, u0, u1, u2)
  );
  return {
    gamma,
    relativeErrorPercent: gamma === null
      ? null
      : roundNumber(Math.abs(gamma - theoreticalGamma) / theoreticalGamma * 100, 2),
    gapFromActualPercent: gamma === null || actualGamma === null
      ? null
      : roundNumber(Math.abs(gamma - actualGamma) / gamma * 100, 2),
    windows: [u0, u1, u2],
  };
};
