import type { PistonOscillationTrajectory } from '../../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';

export const PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN = 120;
export const PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM = 5;
export const PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM = 80;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const VISIBLE_PRESSURE_SWING_PA = 500;
const SYNCHRONIZED_AUDIO_MULTIPLIER = 1.48;
const STAGGERED_AUDIO_MULTIPLIER = 0.97;

export interface PistonReboundSound {
  durationMs: number;
  severity: number;
}

export const getPistonReboundSound = (
  trajectory: PistonOscillationTrajectory,
  severity: number,
): PistonReboundSound => {
  const { equilibrium, samples } = trajectory;
  const windowMs = (samples.at(-1)?.timeS ?? 0) * 1000;
  if (samples.length < 2) return { durationMs: 0, severity };
  const pressureSwing = (index: number) => Math.abs(samples[index]!.pressurePa - equilibrium.equilibriumPressurePa);
  // The relative threshold also gives a short sound to valid, very light presses.
  const thresholdPa = Math.min(VISIBLE_PRESSURE_SWING_PA, pressureSwing(0) * 0.2);
  // Search the complete physical trajectory, including the ideal gas
  // tail; do not truncate long vibrations at the old animation limit.
  const searchEndIndex = Math.min(samples.length - 1, Math.floor((windowMs + 55) * trajectory.sampleRateHz / 1000));
  let effectiveDurationMs = 0;
  for (let index = searchEndIndex; index > 0; index--) {
    const amplitude = pressureSwing(index);
    if (amplitude < thresholdPa) continue;
    if (index === samples.length - 1 || (amplitude >= pressureSwing(index - 1) && amplitude >= pressureSwing(index + 1))) {
      effectiveDurationMs = Math.min(windowMs, samples[index]!.timeS * 1000);
      break;
    }
  }
  const multiplier = SYNCHRONIZED_AUDIO_MULTIPLIER
    + severity * (STAGGERED_AUDIO_MULTIPLIER - SYNCHRONIZED_AUDIO_MULTIPLIER);
  return { durationMs: Math.max(30, effectiveDurationMs * multiplier), severity };
};

export class PistonOscillationScrewGrainAccumulator {
  private carriedGrainFraction = 0;

  consume(angleDeltaDeg: number) {
    if (!Number.isFinite(angleDeltaDeg)) return 0;
    const accumulated = this.carriedGrainFraction
      + Math.abs(angleDeltaDeg) / PISTON_OSCILLATION_SCREW_DEGREES_PER_GRAIN;
    const grains = Math.floor(accumulated);
    this.carriedGrainFraction = accumulated - grains;
    return grains;
  }

  reset() {
    this.carriedGrainFraction = 0;
  }
}

export const getPistonOscillationMechanicalVariation = (
  rateRandom: number,
  gainRandom: number,
) => {
  const playbackRate = 0.97 + clampUnit(rateRandom) * 0.06;
  const gainDb = -0.8 + clampUnit(gainRandom) * 1.6;
  return {
    playbackRate,
    gain: 10 ** (gainDb / 20),
  };
};

export const getPistonOscillationBottomImpactGain = (dropDistanceMm: number) => {
  if (
    !Number.isFinite(dropDistanceMm)
    || dropDistanceMm < PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM
  ) return 0;
  const normalizedDrop = clampUnit(
    (dropDistanceMm - PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM)
      / (PISTON_OSCILLATION_BOTTOM_IMPACT_FULL_SCALE_DROP_MM
        - PISTON_OSCILLATION_BOTTOM_IMPACT_MIN_DROP_MM),
  );
  return 0.18 + 0.82 * normalizedDrop ** 0.65;
};
