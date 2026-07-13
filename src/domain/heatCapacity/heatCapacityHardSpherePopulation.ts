export const HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES = 128;
const HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES = 24;
const HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES = 42;

// A rendered sphere is a teaching sample, not one physical molecule. This gain keeps
// small mass changes legible while preserving a monotonic, mass-driven population.
const HEAT_CAPACITY_HARD_SPHERE_AMOUNT_EXAGGERATION = 19;

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const finiteOrFallback = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export interface HeatCapacityHardSpherePopulationInput {
  amountRatio: number;
  particleMultiplier?: number;
  particleCountScale?: number;
}

export interface HeatCapacityHardSpherePopulation {
  baselineParticleCount: number;
  targetParticleCount: number;
}

const scaleHeatCapacityHardSphereParticleCount = (
  particleCount: number,
  particleCountScale = 1,
) => clampNumber(
  Math.round(
    clampNumber(Math.round(finiteOrFallback(particleCount, 0)), 0, HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES) *
      clampNumber(finiteOrFallback(particleCountScale, 1), 0.25, 1.25),
  ),
  0,
  HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
);

export const resolveHeatCapacityHardSpherePopulation = (
  input: HeatCapacityHardSpherePopulationInput,
): HeatCapacityHardSpherePopulation => {
  const particleMultiplier = clampNumber(finiteOrFallback(input.particleMultiplier, 1), 0.5, 1.25);
  const particleCountScale = clampNumber(finiteOrFallback(input.particleCountScale, 1), 0.25, 1.25);
  const amountRatio = clampNumber(finiteOrFallback(input.amountRatio, 1), 0.25, 2);
  const unscaledBaselineParticleCount = clampNumber(
    Math.max(
      HEAT_CAPACITY_HARD_SPHERE_MIN_PARTICLES,
      Math.round(HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES * particleMultiplier),
    ),
    0,
    HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  );
  const unscaledTargetParticleCount = clampNumber(
    Math.round(
      HEAT_CAPACITY_HARD_SPHERE_BASE_PARTICLES *
        (1 + (amountRatio - 1) * HEAT_CAPACITY_HARD_SPHERE_AMOUNT_EXAGGERATION) *
        particleMultiplier,
    ),
    unscaledBaselineParticleCount,
    HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES,
  );

  return {
    baselineParticleCount: scaleHeatCapacityHardSphereParticleCount(
      unscaledBaselineParticleCount,
      particleCountScale,
    ),
    targetParticleCount: scaleHeatCapacityHardSphereParticleCount(
      unscaledTargetParticleCount,
      particleCountScale,
    ),
  };
};
