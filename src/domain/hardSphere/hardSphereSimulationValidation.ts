import type { SimulationParams } from '../../shared/types.ts';

export const HARD_SPHERE_MAX_PARTICLE_COUNT = 1000;
export const HARD_SPHERE_MAX_PACKING_FRACTION = 0.5;
export const HARD_SPHERE_MIN_BOX_LENGTH = 0.001;
export const HARD_SPHERE_MAX_BOX_LENGTH = 1000;
export const HARD_SPHERE_MIN_PARTICLE_RADIUS = 0.000001;
export const HARD_SPHERE_MAX_PARTICLE_RADIUS = 100;
export const HARD_SPHERE_MIN_MASS = 0.000001;
export const HARD_SPHERE_MAX_MASS = 1_000_000;
export const HARD_SPHERE_MIN_BOLTZMANN_CONSTANT = 0.000001;
export const HARD_SPHERE_MAX_BOLTZMANN_CONSTANT = 1_000_000;
export const HARD_SPHERE_MIN_TARGET_TEMPERATURE = 0.001;
export const HARD_SPHERE_MAX_TARGET_TEMPERATURE = 10_000;
export const HARD_SPHERE_MIN_TIME_STEP = 0.000001;
export const HARD_SPHERE_MAX_TIME_STEP = 0.1;
export const HARD_SPHERE_MAX_PHASE_DURATION = 86_400;
export const HARD_SPHERE_MAX_COLLECTED_SAMPLES = 2000;
export const HARD_SPHERE_MAX_TEMPERATURE_HISTORY = 300;
export const HARD_SPHERE_MAX_PRESSURE_HISTORY = 800;

export interface HardSphereSimulationParamsValidationResult {
  valid: boolean;
  errors: string[];
}

const hasPositiveFiniteValue = (value: number) => Number.isFinite(value) && value > 0;

const clampFinite = (value: number, minimum: number, maximum: number, fallback: number) => (
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : fallback))
);

export const getHardSpherePackingFraction = (params: SimulationParams) => (
  params.N * (4 / 3) * Math.PI * Math.pow(params.r / params.L, 3)
);

export const sanitizeHardSphereSimulationParams = (
  params: SimulationParams,
): SimulationParams => {
  const N = Math.min(
    HARD_SPHERE_MAX_PARTICLE_COUNT,
    Math.max(1, Math.round(Number.isFinite(params.N) ? params.N : 1)),
  );
  const L = clampFinite(
    params.L,
    HARD_SPHERE_MIN_BOX_LENGTH,
    HARD_SPHERE_MAX_BOX_LENGTH,
    10,
  );
  const packingRadiusLimit = L * Math.cbrt(
    HARD_SPHERE_MAX_PACKING_FRACTION / (N * (4 / 3) * Math.PI),
  );
  const gridRadiusLimit = L / Math.ceil(Math.cbrt(N)) / 2;
  const radiusMaximum = Math.max(
    HARD_SPHERE_MIN_PARTICLE_RADIUS,
    Math.min(
      HARD_SPHERE_MAX_PARTICLE_RADIUS,
      L * (0.5 - 1e-9),
      packingRadiusLimit * (1 - 1e-9),
      gridRadiusLimit * (1 - 1e-9),
    ),
  );
  const dt = clampFinite(
    params.dt,
    HARD_SPHERE_MIN_TIME_STEP,
    HARD_SPHERE_MAX_TIME_STEP,
    0.01,
  );
  const targetTemperature = params.targetTemperature === undefined
    ? undefined
    : clampFinite(
        params.targetTemperature,
        HARD_SPHERE_MIN_TARGET_TEMPERATURE,
        HARD_SPHERE_MAX_TARGET_TEMPERATURE,
        1,
      );
  const m = clampFinite(params.m, HARD_SPHERE_MIN_MASS, HARD_SPHERE_MAX_MASS, 1);
  const rawK = clampFinite(
    params.k,
    HARD_SPHERE_MIN_BOLTZMANN_CONSTANT,
    HARD_SPHERE_MAX_BOLTZMANN_CONSTANT,
    1,
  );
  const k = targetTemperature === undefined
    ? clampFinite(
        rawK,
        Math.max(HARD_SPHERE_MIN_BOLTZMANN_CONSTANT, m / HARD_SPHERE_MAX_TARGET_TEMPERATURE),
        Math.min(HARD_SPHERE_MAX_BOLTZMANN_CONSTANT, m / HARD_SPHERE_MIN_TARGET_TEMPERATURE),
        m,
      )
    : rawK;
  return {
    L,
    N,
    r: clampFinite(params.r, HARD_SPHERE_MIN_PARTICLE_RADIUS, radiusMaximum, radiusMaximum),
    m,
    k,
    dt,
    nu: clampFinite(params.nu, 0, 1 / dt, 0),
    equilibriumTime: clampFinite(params.equilibriumTime, 0, HARD_SPHERE_MAX_PHASE_DURATION, 0),
    statsDuration: clampFinite(params.statsDuration, 0.001, HARD_SPHERE_MAX_PHASE_DURATION, 1),
    ...(targetTemperature === undefined ? {} : { targetTemperature }),
  };
};

export const validateHardSphereSimulationParams = (
  params: SimulationParams,
): HardSphereSimulationParamsValidationResult => {
  const errors: string[] = [];

  if (!Number.isFinite(params.N) || params.N <= 0) {
    errors.push('N must be greater than 0.');
  } else if (!Number.isSafeInteger(params.N)) {
    errors.push('N must be a safe integer.');
  } else if (params.N > HARD_SPHERE_MAX_PARTICLE_COUNT) {
    errors.push(`N must be ${HARD_SPHERE_MAX_PARTICLE_COUNT} or less.`);
  }

  if (!hasPositiveFiniteValue(params.L)) {
    errors.push('L must be greater than 0.');
  } else if (params.L < HARD_SPHERE_MIN_BOX_LENGTH || params.L > HARD_SPHERE_MAX_BOX_LENGTH) {
    errors.push(`L must be ${HARD_SPHERE_MIN_BOX_LENGTH} to ${HARD_SPHERE_MAX_BOX_LENGTH}.`);
  }
  if (!hasPositiveFiniteValue(params.r)) {
    errors.push('r must be greater than 0.');
  } else if (
    params.r < HARD_SPHERE_MIN_PARTICLE_RADIUS ||
    params.r > HARD_SPHERE_MAX_PARTICLE_RADIUS
  ) {
    errors.push(`r must be ${HARD_SPHERE_MIN_PARTICLE_RADIUS} to ${HARD_SPHERE_MAX_PARTICLE_RADIUS}.`);
  }
  if (!hasPositiveFiniteValue(params.m)) {
    errors.push('m must be greater than 0.');
  } else if (params.m < HARD_SPHERE_MIN_MASS || params.m > HARD_SPHERE_MAX_MASS) {
    errors.push(`m must be ${HARD_SPHERE_MIN_MASS} to ${HARD_SPHERE_MAX_MASS}.`);
  }
  if (!hasPositiveFiniteValue(params.k)) {
    errors.push('k must be greater than 0.');
  } else if (
    params.k < HARD_SPHERE_MIN_BOLTZMANN_CONSTANT ||
    params.k > HARD_SPHERE_MAX_BOLTZMANN_CONSTANT
  ) {
    errors.push(
      `k must be ${HARD_SPHERE_MIN_BOLTZMANN_CONSTANT} to ${HARD_SPHERE_MAX_BOLTZMANN_CONSTANT}.`,
    );
  }

  if (!hasPositiveFiniteValue(params.dt)) {
    errors.push('dt must be greater than 0.');
  } else if (params.dt < HARD_SPHERE_MIN_TIME_STEP || params.dt > HARD_SPHERE_MAX_TIME_STEP) {
    errors.push(`dt must be ${HARD_SPHERE_MIN_TIME_STEP} to ${HARD_SPHERE_MAX_TIME_STEP}.`);
  }

  if (!Number.isFinite(params.nu) || params.nu < 0) {
    errors.push('nu must be 0 or greater.');
  } else if (hasPositiveFiniteValue(params.dt) && params.dt * params.nu > 1) {
    errors.push('dt * nu must be 1 or less.');
  }

  if (!Number.isFinite(params.equilibriumTime) || params.equilibriumTime < 0) {
    errors.push('equilibriumTime must be 0 or greater.');
  } else if (params.equilibriumTime > HARD_SPHERE_MAX_PHASE_DURATION) {
    errors.push(`equilibriumTime must be ${HARD_SPHERE_MAX_PHASE_DURATION} or less.`);
  }
  if (!hasPositiveFiniteValue(params.statsDuration)) {
    errors.push('statsDuration must be greater than 0.');
  } else if (params.statsDuration > HARD_SPHERE_MAX_PHASE_DURATION) {
    errors.push(`statsDuration must be ${HARD_SPHERE_MAX_PHASE_DURATION} or less.`);
  }
  if (
    params.targetTemperature !== undefined &&
    !hasPositiveFiniteValue(params.targetTemperature)
  ) {
    errors.push('targetTemperature must be greater than 0.');
  } else if (
    params.targetTemperature !== undefined &&
    (
      params.targetTemperature < HARD_SPHERE_MIN_TARGET_TEMPERATURE ||
      params.targetTemperature > HARD_SPHERE_MAX_TARGET_TEMPERATURE
    )
  ) {
    errors.push(
      `targetTemperature must be ${HARD_SPHERE_MIN_TARGET_TEMPERATURE} to ${HARD_SPHERE_MAX_TARGET_TEMPERATURE}.`,
    );
  }

  if (hasPositiveFiniteValue(params.L) && hasPositiveFiniteValue(params.r)) {
    if (2 * params.r >= params.L) {
      errors.push('L must be greater than 2 * r.');
    } else if (
      Number.isSafeInteger(params.N) &&
      params.N > 0 &&
      (
        !Number.isFinite(getHardSpherePackingFraction(params)) ||
        getHardSpherePackingFraction(params) > HARD_SPHERE_MAX_PACKING_FRACTION
      )
    ) {
      errors.push(`Particle packing fraction must be ${HARD_SPHERE_MAX_PACKING_FRACTION} or less.`);
    } else if (
      Number.isSafeInteger(params.N) &&
      params.N > 0 &&
      2 * params.r >= params.L / Math.ceil(Math.cbrt(params.N))
    ) {
      errors.push('N, L, and r must fit the supported non-overlapping initial grid.');
    }
  }

  if (errors.length === 0) {
    const boxVolume = Math.pow(params.L, 3);
    const representativeTargetTemperature = params.targetTemperature ?? params.m / params.k;
    const thermalVariance = 3 * params.k * representativeTargetTemperature / params.m;
    const maximumHistogramSpeed = 3.5 * Math.sqrt(thermalVariance);
    const speedBinSize = maximumHistogramSpeed / 30;
    const maximumHistogramEnergy = 0.5 * params.m * maximumHistogramSpeed * maximumHistogramSpeed;
    const energyBinSize = maximumHistogramEnergy / 30;
    const representativePressure = params.N * params.k * representativeTargetTemperature / boxVolume;
    if (
      !Number.isFinite(boxVolume) || boxVolume <= 0 ||
      !Number.isFinite(representativeTargetTemperature) || representativeTargetTemperature <= 0 ||
      representativeTargetTemperature < HARD_SPHERE_MIN_TARGET_TEMPERATURE ||
      representativeTargetTemperature > HARD_SPHERE_MAX_TARGET_TEMPERATURE ||
      !Number.isFinite(thermalVariance) || thermalVariance <= 0 ||
      !Number.isFinite(speedBinSize) || speedBinSize <= 0 ||
      !Number.isFinite(energyBinSize) || energyBinSize <= 0 ||
      !Number.isFinite(representativePressure) || representativePressure < 0 ||
      !Number.isFinite(params.equilibriumTime + params.statsDuration)
    ) {
      errors.push('Simulation parameters exceed the supported numerical range.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
