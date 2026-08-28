export const PISTON_OSCILLATION_FREE_SAMPLE_RATE_MIN_HZ = 1;
export const PISTON_OSCILLATION_FREE_SAMPLE_RATE_MAX_HZ = 1000;
export const PISTON_OSCILLATION_FREE_TRIGGER_MIN_KPA = 96;
export const PISTON_OSCILLATION_FREE_TRIGGER_MAX_KPA = 130;
export const PISTON_OSCILLATION_MONITOR_GRAPH_MIN_KPA = 96;
export const PISTON_OSCILLATION_MONITOR_GRAPH_MAX_KPA = 132;

export interface PressureGraphDomain {
  minimumKpa: number;
  maximumKpa: number;
  ticksKpa: readonly number[];
}

export const parsePistonOscillationFreeSampleRate = (draft: string): number | null => {
  const trimmed = draft.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value)
    && value >= PISTON_OSCILLATION_FREE_SAMPLE_RATE_MIN_HZ
    && value <= PISTON_OSCILLATION_FREE_SAMPLE_RATE_MAX_HZ
    ? value
    : null;
};

export const parsePistonOscillationFreeTriggerThreshold = (draft: string): number | null => {
  const trimmed = draft.trim();
  if (!/^(?:\d+|\d+\.\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value)
    && value >= PISTON_OSCILLATION_FREE_TRIGGER_MIN_KPA
    && value <= PISTON_OSCILLATION_FREE_TRIGGER_MAX_KPA
    && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8
    ? value
    : null;
};

const chooseNicePressureTickStep = (minimumKpa: number, maximumKpa: number) => {
  const rawStep = Math.max(1, (maximumKpa - minimumKpa) / 6);
  const exponent = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / exponent;
  const multiplier = [1, 2, 3, 4, 5, 6, 8, 10].find((candidate) => (
    candidate >= normalized - 1e-10
  )) ?? 10;
  return Math.max(1, multiplier * exponent);
};

const roundPressureTick = (value: number) => Math.round(value * 1e9) / 1e9;

export const getPistonOscillationAdaptivePressureGraphDomain = (
  triggerThresholdKpa: number,
  pressureValuesKpa: readonly number[],
): PressureGraphDomain => {
  if (parsePistonOscillationFreeTriggerThreshold(String(triggerThresholdKpa)) === null) {
    throw new RangeError('Free-mode trigger threshold must be a 0.1 kPa value from 96.0 to 130.0 kPa.');
  }
  const observedValues = pressureValuesKpa.filter(Number.isFinite);
  const desiredMinimum = Math.min(
    PISTON_OSCILLATION_MONITOR_GRAPH_MIN_KPA,
    triggerThresholdKpa,
    ...observedValues,
  );
  const desiredMaximum = Math.max(
    PISTON_OSCILLATION_MONITOR_GRAPH_MAX_KPA,
    triggerThresholdKpa,
    ...observedValues,
  );
  const tickStepKpa = chooseNicePressureTickStep(desiredMinimum, desiredMaximum);
  let minimumKpa = Math.floor(desiredMinimum / tickStepKpa) * tickStepKpa;
  let maximumKpa = Math.ceil(desiredMaximum / tickStepKpa) * tickStepKpa;
  const observedMinimum = observedValues.length > 0 ? Math.min(...observedValues) : null;
  const observedMaximum = observedValues.length > 0 ? Math.max(...observedValues) : null;
  if (observedMinimum !== null && observedMinimum <= minimumKpa + 1e-9) {
    minimumKpa -= tickStepKpa;
  }
  if (observedMaximum !== null && observedMaximum >= maximumKpa - 1e-9) {
    maximumKpa += tickStepKpa;
  }
  while (triggerThresholdKpa - minimumKpa < tickStepKpa - 1e-9) {
    minimumKpa -= tickStepKpa;
  }
  while (maximumKpa - triggerThresholdKpa < tickStepKpa - 1e-9) {
    maximumKpa += tickStepKpa;
  }
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const spanKpa = maximumKpa - minimumKpa;
    const triggerRatio = (triggerThresholdKpa - minimumKpa) / spanKpa;
    if (triggerRatio < 0.25 - 1e-9) {
      minimumKpa -= tickStepKpa;
    } else if (triggerRatio > 0.75 + 1e-9) {
      maximumKpa += tickStepKpa;
    } else {
      break;
    }
  }
  minimumKpa = roundPressureTick(minimumKpa);
  maximumKpa = roundPressureTick(maximumKpa);
  const intervalCount = Math.round((maximumKpa - minimumKpa) / tickStepKpa);
  return {
    minimumKpa,
    maximumKpa,
    ticksKpa: Array.from(
      { length: intervalCount + 1 },
      (_, index) => roundPressureTick(minimumKpa + tickStepKpa * index),
    ),
  };
};
