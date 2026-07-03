import {
  truncateHeatCapacitySignalMv,
} from './heatCapacitySignalDisplayModel.ts';
import {
  HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
  HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
  HEAT_CAPACITY_STANDARD_OPERATION,
} from './heatCapacityDefaultConfig.ts';
import type {
  HeatCapacityProcessSamplePoint,
  HeatCapacityProcessSamples,
} from './heatCapacityExperimentModel.ts';

export type HeatCapacityGuideRecordKind = 'u0' | 'u1' | 'u2';

export interface HeatCapacityGuideRecord {
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  calibrationVersion: number;
  zeroEventId: string;
}

export interface HeatCapacityGuideCorrectedSignals {
  U0DisplayMv: number;
  U1DisplayMv: number;
  U2DisplayMv: number;
  U1CorrectedMv: number;
  U2CorrectedMv: number;
  gamma: number;
}

export interface HeatCapacityGuideEventLogEntry {
  atS: number;
  type: 'workflow' | 'blocked-action' | 'record' | 'pump' | 'release' | 'timer' | 'abort' | 'complete';
  message: string;
  data?: Record<string, unknown>;
}

export interface HeatCapacityGuideTrial {
  id: string;
  source: 'guide' | 'demo';
  u0: HeatCapacityGuideRecord | null;
  u1: HeatCapacityGuideRecord | null;
  u2: HeatCapacityGuideRecord | null;
  correctedSignals: HeatCapacityGuideCorrectedSignals | null;
  completedAtMs: number | null;
  eventLog: HeatCapacityGuideEventLogEntry[];
}

export interface HeatCapacityGuideGammaCalculationOptions {
  atmosphericPressureKPa?: number;
  pressureSensitivityMvPerKPa?: number;
}

const DEFAULT_ATMOSPHERIC_PRESSURE_KPA = 101.3;
const DEFAULT_PRESSURE_SENSITIVITY_MV_PER_KPA = 20;

const roundNumber = (value: number, digits = 6) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

export const createHeatCapacityGuideTrial = (id: string): HeatCapacityGuideTrial => ({
  id,
  source: 'guide',
  u0: null,
  u1: null,
  u2: null,
  correctedSignals: null,
  completedAtMs: null,
  eventLog: [],
});

const getPresetDemoRecordTime = (
  sample: HeatCapacityProcessSamplePoint | null,
  fallbackAtS: number,
) => (sample ? sample.timeS : fallbackAtS);

const createPresetDemoGuideRecord = ({
  sample,
  kind,
  pressureSignalMv,
  fallbackAtS,
}: {
  sample: HeatCapacityProcessSamplePoint | null;
  kind: HeatCapacityGuideRecordKind;
  pressureSignalMv: number;
  fallbackAtS: number;
}): HeatCapacityGuideRecord => ({
  atS: getPresetDemoRecordTime(sample, fallbackAtS),
  displayPressureMv: roundNumber(pressureSignalMv, 2),
  displayTemperatureMv: roundNumber(sample?.temperatureSignalMv ?? HEAT_CAPACITY_AUTO_DEMO_RESULT_TEMPERATURE_MV, 2),
  calibrationVersion: 0,
  zeroEventId: `demo-${kind}`,
});

export const createHeatCapacityDemoTrialFromPreset = (
  samples: HeatCapacityProcessSamples = {},
  completedAtMs = Date.now(),
  options: HeatCapacityGuideGammaCalculationOptions = {},
): HeatCapacityGuideTrial => {
  const zeroed = samples.zeroedSample ?? samples.startSample ?? null;
  const beforeRelease = samples.stableBeforeReleaseSample ?? samples.beforeReleaseSample ?? null;
  const afterRecovery = samples.recoverySample ?? null;
  const u0AtS = 0;
  const u1AtS = HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS +
    HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS;
  const u2AtS = u1AtS +
    HEAT_CAPACITY_STANDARD_OPERATION.openDurationS +
    HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS;
  const trial: HeatCapacityGuideTrial = {
    id: 'heat-demo-trial',
    source: 'demo',
    u0: createPresetDemoGuideRecord({
      sample: zeroed,
      kind: 'u0',
      pressureSignalMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U0_MV,
      fallbackAtS: u0AtS,
    }),
    u1: createPresetDemoGuideRecord({
      sample: beforeRelease,
      kind: 'u1',
      pressureSignalMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U1_MV,
      fallbackAtS: u1AtS,
    }),
    u2: createPresetDemoGuideRecord({
      sample: afterRecovery,
      kind: 'u2',
      pressureSignalMv: HEAT_CAPACITY_AUTO_DEMO_RESULT_U2_MV,
      fallbackAtS: u2AtS,
    }),
    correctedSignals: null,
    completedAtMs,
    eventLog: [],
  };

  return {
    ...trial,
    correctedSignals: calculateGuideHeatCapacityTrialSignals(trial, options),
    eventLog: [
      {
        atS: trial.u2?.atS ?? trial.u1?.atS ?? trial.u0?.atS ?? 0,
        type: 'complete',
        message: 'demo-complete',
        data: { source: 'demo', preset: true },
      },
    ],
  };
};

export const normalizeHeatCapacityGuideRecord = (
  input: HeatCapacityGuideRecord,
): HeatCapacityGuideRecord => ({
  ...input,
  displayPressureMv: truncateHeatCapacitySignalMv(input.displayPressureMv),
  displayTemperatureMv: truncateHeatCapacitySignalMv(input.displayTemperatureMv),
});

const appendGuideEvent = (
  trial: HeatCapacityGuideTrial,
  entry: HeatCapacityGuideEventLogEntry,
): HeatCapacityGuideTrial => ({
  ...trial,
  eventLog: [...trial.eventLog, entry],
});

export const calculateGuideHeatCapacityTrialSignals = (
  trial: HeatCapacityGuideTrial,
  options: HeatCapacityGuideGammaCalculationOptions = {},
): HeatCapacityGuideCorrectedSignals | null => {
  if (!trial.u0 || !trial.u1 || !trial.u2) return null;
  const U0DisplayMv = trial.u0.displayPressureMv;
  const U1DisplayMv = trial.u1.displayPressureMv;
  const U2DisplayMv = trial.u2.displayPressureMv;
  const U1CorrectedMv = U1DisplayMv - U0DisplayMv;
  const U2CorrectedMv = U2DisplayMv - U0DisplayMv;
  const atmosphericPressureKPa = options.atmosphericPressureKPa ?? DEFAULT_ATMOSPHERIC_PRESSURE_KPA;
  const pressureSensitivityMvPerKPa = options.pressureSensitivityMvPerKPa ?? DEFAULT_PRESSURE_SENSITIVITY_MV_PER_KPA;
  const P0KPa = atmosphericPressureKPa;
  const P1KPa = P0KPa + U1CorrectedMv / pressureSensitivityMvPerKPa;
  const P2KPa = P0KPa + U2CorrectedMv / pressureSensitivityMvPerKPa;
  const denominator = Math.log(P1KPa / P2KPa);
  const gamma = Math.log(P1KPa / P0KPa) / denominator;

  if (
    U1CorrectedMv <= U2CorrectedMv ||
    U1CorrectedMv <= 0 ||
    U2CorrectedMv <= 0 ||
    !Number.isFinite(gamma)
  ) {
    return null;
  }

  return {
    U0DisplayMv,
    U1DisplayMv,
    U2DisplayMv,
    U1CorrectedMv: roundNumber(U1CorrectedMv),
    U2CorrectedMv: roundNumber(U2CorrectedMv),
    gamma: roundNumber(gamma),
  };
};

export const recordGuideU0 = (
  trial: HeatCapacityGuideTrial,
  input: HeatCapacityGuideRecord,
): HeatCapacityGuideTrial => {
  const record = normalizeHeatCapacityGuideRecord(input);
  return appendGuideEvent({
    ...trial,
    u0: record,
    u1: null,
    u2: null,
    correctedSignals: null,
    completedAtMs: null,
  }, {
    atS: record.atS,
    type: 'record',
    message: 'record-u0',
    data: { kind: 'u0' },
  });
};

export const recordGuideU1 = (
  trial: HeatCapacityGuideTrial,
  input: HeatCapacityGuideRecord,
): HeatCapacityGuideTrial => {
  const record = normalizeHeatCapacityGuideRecord(input);
  return appendGuideEvent({
    ...trial,
    u1: record,
    u2: null,
    correctedSignals: null,
    completedAtMs: null,
  }, {
    atS: record.atS,
    type: 'record',
    message: 'record-u1',
    data: { kind: 'u1' },
  });
};

export const recordGuideU2 = (
  trial: HeatCapacityGuideTrial,
  input: HeatCapacityGuideRecord,
  completedAtMs: number | null = null,
  options: HeatCapacityGuideGammaCalculationOptions = {},
): HeatCapacityGuideTrial => {
  const record = normalizeHeatCapacityGuideRecord(input);
  const nextTrial = {
    ...trial,
    u2: record,
  };
  const completedTrial = {
    ...nextTrial,
    correctedSignals: calculateGuideHeatCapacityTrialSignals(nextTrial, options),
    completedAtMs,
  };
  return appendGuideEvent(completedTrial, {
    atS: record.atS,
    type: 'record',
    message: 'record-u2',
    data: { kind: 'u2' },
  });
};
