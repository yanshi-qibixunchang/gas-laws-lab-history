export const PISTON_DEFAULT_TRIGGER_KPA = 120;
export const PISTON_DEFAULT_RECORDING_DURATION_S = 0.5;
export const PISTON_RECORDING_DURATION_RANGE_S = { minimum: 0.1, maximum: 2 } as const;

export type PistonOscillationAcquisitionSetting =
  | 'sampleRateHz'
  | 'triggerThresholdKpa'
  | 'recordingDurationS';

export const isPistonRecordingDurationS = (value: unknown): value is number => (
  typeof value === 'number'
  && Number.isFinite(value)
  && value >= PISTON_RECORDING_DURATION_RANGE_S.minimum
  && value <= PISTON_RECORDING_DURATION_RANGE_S.maximum
  && Math.abs(value * 1_000 - Math.round(value * 1_000)) < 1e-9
);

export const getPistonRecordingIntervalCount = (durationS: number, sampleRateHz: number) => (
  Math.floor(durationS * sampleRateHz + 1e-9)
);
