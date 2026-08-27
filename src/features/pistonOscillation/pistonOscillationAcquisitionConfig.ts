import { PISTON_EXPERIMENT_HEIGHTS_MM } from './pistonOscillationModelMotion.ts';

export const PISTON_ACQUISITION_BASELINE_PRESSURE_KPA = 101.325;
export const PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA = 105;
export const PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ = 1000;
export const PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS = PISTON_EXPERIMENT_HEIGHTS_MM.length;

export const getPistonAcquisitionFormalSampleCount = (
  durationSeconds: number,
  sampleRateHz: number,
) => durationSeconds <= 0 ? 0 : Math.floor(durationSeconds * sampleRateHz) + 1;
