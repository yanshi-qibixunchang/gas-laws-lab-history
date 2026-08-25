import { PISTON_EXPERIMENT_HEIGHTS_MM } from './pistonOscillationModelMotion.ts';
import {
  quantizePistonOscillationObservedPressureKpa,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';

export const PISTON_ACQUISITION_BASELINE_PRESSURE_KPA = 101.325;
export const PISTON_ACQUISITION_DEFAULT_TRIGGER_KPA = 105;
export const PISTON_ACQUISITION_DEFAULT_SAMPLE_RATE_HZ = 1000;
export const PISTON_ACQUISITION_FREE_MAX_MEASUREMENTS = PISTON_EXPERIMENT_HEIGHTS_MM.length;
export const PISTON_ACQUISITION_PRESET_FREQUENCY_HZ = 7.5;
export const PISTON_ACQUISITION_PRESET_DAMPING_PER_SECOND = 6.2;

export const getPistonAcquisitionPresetPressureKpa = (seconds: number) => {
  if (seconds < 0) return PISTON_ACQUISITION_BASELINE_PRESSURE_KPA;
  const oscillation = 6.8
    * Math.exp(-PISTON_ACQUISITION_PRESET_DAMPING_PER_SECOND * seconds)
    * Math.cos(Math.PI * 2 * PISTON_ACQUISITION_PRESET_FREQUENCY_HZ * seconds);
  const deterministicSensorRipple = 0.018 * Math.sin(Math.PI * 2 * 37 * seconds);
  return PISTON_ACQUISITION_BASELINE_PRESSURE_KPA
    + oscillation
    + deterministicSensorRipple;
};

export const findPistonAcquisitionFallingTriggerSeconds = (
  thresholdKpa: number,
  sampleRateHz: number,
) => {
  const stepSeconds = 1 / sampleRateHz;
  let previousPressure = quantizePistonOscillationObservedPressureKpa(
    getPistonAcquisitionPresetPressureKpa(0) * 1_000,
  );
  for (let index = 1; index <= sampleRateHz; index += 1) {
    const seconds = index * stepSeconds;
    const pressure = quantizePistonOscillationObservedPressureKpa(
      getPistonAcquisitionPresetPressureKpa(seconds) * 1_000,
    );
    if (previousPressure >= thresholdKpa && pressure < thresholdKpa) return seconds;
    previousPressure = pressure;
  }
  return null;
};

export const getPistonAcquisitionFormalSampleCount = (
  durationSeconds: number,
  sampleRateHz: number,
) => durationSeconds <= 0 ? 0 : Math.floor(durationSeconds * sampleRateHz) + 1;
