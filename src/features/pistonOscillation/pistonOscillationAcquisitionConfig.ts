import { getPistonRecordingIntervalCount, PISTON_DEFAULT_TRIGGER_KPA } from '../../domain/pistonOscillation/pistonOscillationRecordingSettings.ts';
import { PISTON_OSCILLATION_FREE_MAXIMUM_MEASUREMENT_COUNT } from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';

export const PISTON_ACQUISITION_BASELINE_PRESSURE_KPA = 101.325;
export const PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA = PISTON_DEFAULT_TRIGGER_KPA;
export const PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ = 1000;
export const PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS = PISTON_OSCILLATION_FREE_MAXIMUM_MEASUREMENT_COUNT;

export const getPistonAcquisitionFormalSampleCount = (
  durationSeconds: number,
  sampleRateHz: number,
) => durationSeconds <= 0 ? 0 : getPistonRecordingIntervalCount(durationSeconds, sampleRateHz) + 1;
