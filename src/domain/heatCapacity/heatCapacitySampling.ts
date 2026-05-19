export type HeatCapacitySampleKey =
  | 'zeroed'
  | 'beforeRelease'
  | 'afterRecovery';

export interface HeatCapacitySample {
  key: HeatCapacitySampleKey;
  label: string;
  timeS: number;
  phase: string;
  pressureSignalMv: number;
  temperatureSignalMv?: number;
  note: string;
}

export type HeatCapacitySampleMap = Partial<Record<HeatCapacitySampleKey, HeatCapacitySample>>;

export const HEAT_CAPACITY_DETERMINISTIC_SAMPLE_VALUES = {
  U0Mv: 0,
  U1Mv: 120,
  U2Mv: 34.3,
} as const;

const cloneSample = (sample: HeatCapacitySample): HeatCapacitySample => ({ ...sample });

export const recordHeatCapacitySample = (
  samples: HeatCapacitySampleMap,
  sample: HeatCapacitySample,
): HeatCapacitySampleMap => ({
  ...samples,
  [sample.key]: cloneSample(sample),
});

export const getHeatCapacitySample = (
  samples: HeatCapacitySample[] | HeatCapacitySampleMap,
  key: HeatCapacitySampleKey,
): HeatCapacitySample | null => {
  if (Array.isArray(samples)) {
    const sample = samples.find((entry) => entry.key === key);
    return sample ? cloneSample(sample) : null;
  }

  const sample = samples[key];
  return sample ? cloneSample(sample) : null;
};

export const resetHeatCapacitySamples = (): HeatCapacitySampleMap => ({});

export const createDeterministicHeatCapacitySamples = (): HeatCapacitySample[] => [
  {
    key: 'zeroed',
    label: 'U0 zeroed pressure signal',
    timeS: 0,
    phase: 'zeroed',
    pressureSignalMv: HEAT_CAPACITY_DETERMINISTIC_SAMPLE_VALUES.U0Mv,
    note: 'Pressure display is zeroed before formal pumping.',
  },
  {
    key: 'beforeRelease',
    label: 'U1 before quick release',
    timeS: 1,
    phase: 'sealedStabilizing',
    pressureSignalMv: HEAT_CAPACITY_DETERMINISTIC_SAMPLE_VALUES.U1Mv,
    note: 'Bottle is sealed and stable before the quick release.',
  },
  {
    key: 'afterRecovery',
    label: 'U2 after thermal recovery',
    timeS: 2,
    phase: 'recovering',
    pressureSignalMv: HEAT_CAPACITY_DETERMINISTIC_SAMPLE_VALUES.U2Mv,
    note: 'Stopcock is closed and the gas has recovered toward ambient temperature.',
  },
];
