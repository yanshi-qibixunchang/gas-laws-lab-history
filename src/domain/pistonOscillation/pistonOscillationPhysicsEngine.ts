import {
  PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
} from './pistonOscillationAirMaterialModel.ts';
import {
  PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M,
} from './pistonOscillationEquivalentLossModel.ts';

export const PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K =
  8.31446261815324;
export const PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2 = 9.80665;

export const PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION =
  'piston-oscillation-rk4-pasco-td8572a-v3' as const;
export const PISTON_OSCILLATION_BASE_STATE_MODEL_VERSION =
  'piston-oscillation-equilibrium-state-v1' as const;
export const PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION =
  'piston-oscillation-rk4-single-temperature-thermal-v4' as const;

export const PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION = 1 as const;
export const PISTON_OSCILLATION_THERMAL_EXTENSION_MODEL_VERSION =
  'piston-oscillation-thermal-extension-disabled-v1' as const;
export const PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION =
  'piston-oscillation-single-temperature-relaxation-v1' as const;
export const PISTON_OSCILLATION_SETTLING_MODEL_VERSION =
  'piston-oscillation-isothermal-weight-settling-v1' as const;
export const PISTON_OSCILLATION_SETTLING_DURATION_S = 0.2 as const;

export interface PistonOscillationPhysicsConfig {
  gamma: number;
  ambientPressurePa: number;
  ambientTemperatureK: number;
  movingMassKg: number;
  equivalentDeadVolumeHeightM: number;
  linearDampingNsPerM: number;
  sensorSampleRateHz: number;
  trajectoryDurationS: number;
}

export interface PistonOscillationEquilibriumState {
  cylinderAreaM2: number;
  lockedHeightM: number;
  lockedGraduatedCylinderVolumeM3: number;
  lockedVolumeM3: number;
  lockedPressurePa: number;
  lockedTemperatureK: number;
  equilibriumHeightM: number;
  graduatedCylinderVolumeM3: number;
  sealedDeadVolumeM3: number;
  effectiveGasHeightM: number;
  equilibriumVolumeM3: number;
  equilibriumPressurePa: number;
  gasAmountMol: number;
  settlingDisplacementM: number;
}

export type PistonOscillationThermodynamicPhase =
  | 'vented'
  | 'sealed-locked-atmospheric'
  | 'settling'
  | 'sealed-loaded';

export interface PistonOscillationDisabledThermalExtensionState {
  modelVersion: typeof PISTON_OSCILLATION_THERMAL_EXTENSION_MODEL_VERSION;
  enabled: false;
  wallTemperatureK: number;
  cumulativeHeatTransferJ: number;
}

export interface PistonOscillationFiniteThermalExtensionState {
  modelVersion: typeof PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION;
  enabled: true;
  wallTemperatureK: number;
  cumulativeHeatTransferJ: number;
  relaxationTimeAtReferenceHeightS: number;
  referenceGraduatedHeightM: number;
  volumeExponent: number;
  provenance: 'identified-candidate';
}

export type PistonOscillationThermalExtensionState =
  | PistonOscillationDisabledThermalExtensionState
  | PistonOscillationFiniteThermalExtensionState;

/**
 * Authoritative gas state shared by the visual model, live sensor, and saved
 * free-mode instrument state. Legacy states keep the disabled thermal branch;
 * finite-thermal runs use the versioned candidate branch without changing the
 * persisted outer shape.
 */
export interface PistonOscillationThermodynamicState {
  schemaVersion: typeof PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION;
  modelVersion:
    | typeof PISTON_OSCILLATION_BASE_STATE_MODEL_VERSION
    | typeof PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
    | typeof PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION;
  phase: PistonOscillationThermodynamicPhase;
  nominalLockedHeightM: number;
  pistonHeightM: number;
  velocityMPerS: number;
  graduatedCylinderVolumeM3: number;
  sealedDeadVolumeM3: number;
  totalVolumeM3: number;
  gasAmountMol: number;
  molarHeatCapacityAtConstantVolumeJPerMolK: number;
  internalEnergyJ: number;
  pressurePa: number;
  temperatureK: number;
  settlingProgress: number;
  thermal: PistonOscillationThermalExtensionState;
}

export interface PistonOscillationTrajectorySample {
  timeS: number;
  displacementM: number;
  velocityMPerS: number;
  pressurePa: number;
  temperatureK: number;
  cumulativeHeatTransferJ?: number;
}

export interface PistonOscillationTrajectory {
  modelVersion: string;
  initialThermodynamicState: PistonOscillationThermodynamicState | null;
  thermalModel: PistonOscillationFiniteThermalExtensionState | null;
  config: PistonOscillationPhysicsConfig;
  equilibrium: PistonOscillationEquilibriumState;
  initialDisplacementM: number;
  initialVelocityMPerS: number;
  sampleRateHz: number;
  integrationSubstepsPerSample: number;
  samples: readonly PistonOscillationTrajectorySample[];
  diagnostics: {
    minimumPressureKpa: number;
    maximumPressureKpa: number;
    withinSensorRange: boolean;
  };
}

export interface PistonOscillationReleaseInput {
  /** True loaded equilibrium height. Kept for historical records. */
  equilibriumHeightMm?: number;
  /** Height fixed by the screw before the atmospheric gas is loaded. */
  lockedHeightMm?: number;
  initialDisplacementMm: number;
  initialVelocityMmPerS?: number;
}

export interface PistonOscillationIdealAdiabaticInstantaneousState {
  displacementM: number;
  pressurePa: number;
  temperatureK: number;
  equilibrium: PistonOscillationEquilibriumState;
  config: PistonOscillationPhysicsConfig;
  gasState: PistonOscillationThermodynamicState;
}

export interface PistonOscillationStablePhysicalStateInput {
  hoseConnected: boolean;
  lockingScrewLocked: boolean;
  nominalHeightMm: number;
  visibleHeightMm: number;
  referenceThermodynamicState?: PistonOscillationThermodynamicState | null;
}

export interface PistonOscillationStablePhysicalState {
  nominalHeightMm: number;
  equilibriumHeightMm: number;
  pistonOffsetMm: 0;
  thermodynamicState: PistonOscillationThermodynamicState;
}

export const PISTON_OSCILLATION_CYLINDER_DIAMETER_M = 0.0325;
export const PISTON_OSCILLATION_CYLINDER_DIAMETER_TOLERANCE_M = 0.0001;
export const PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG = 0.0485;
export const PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_TOLERANCE_KG = 0.0006;
// Includes the hose, quick-connect passages, pressure-sensor cavity, and the
// ungraduated volume below the cylinder scale. The equivalent-height form is
// retained in the persisted config so historical runs remain self-contained.
export const PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3 = 6.93443255553023e-6;
export const PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M = 0.008359;
export const PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA = 20;
export const PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA = 200;
const PISTON_OSCILLATION_MAX_INTEGRATION_STEP_S = 1 / 12_000;
const PISTON_OSCILLATION_MIN_INTEGRATION_STEPS_PER_PERIOD = 240;

export const PISTON_OSCILLATION_INITIAL_CALIBRATION_PROFILE = {
  equivalentDeadVolumeHeightM: PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M,
  // This coefficient preserves the already accepted guided waveform only. It is
  // a versioned temporary equivalent loss, not an identified friction or
  // thermodynamic-damping coefficient.
  linearDampingNsPerM: PISTON_OSCILLATION_TEMPORARY_LINEAR_LOSS_NS_PER_M,
} as const;

export const DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG: PistonOscillationPhysicsConfig = {
  gamma: PISTON_OSCILLATION_AIR_ADIABATIC_INDEX,
  ambientPressurePa: 101_325,
  ambientTemperatureK: 293.15,
  movingMassKg: PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  ...PISTON_OSCILLATION_INITIAL_CALIBRATION_PROFILE,
  sensorSampleRateHz: 1_000,
  trajectoryDurationS: 6,
};

const assertFiniteRange = (
  name: string,
  value: number,
  minimum: number,
  maximum: number,
) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
};

const assertFiniteNumber = (name: string, value: number) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  return value;
};

export const normalizePistonOscillationPhysicsConfig = (
  input: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationPhysicsConfig => {
  const defaults = DEFAULT_PISTON_OSCILLATION_PHYSICS_CONFIG;
  const gamma = input.gamma ?? defaults.gamma;
  if (!Number.isFinite(gamma) || gamma <= 1 || gamma > 2) {
    throw new RangeError('gamma must be greater than 1 and no greater than 2.');
  }
  if (
    input.equivalentDeadVolumeHeightM !== undefined
    && (
      !Number.isFinite(input.equivalentDeadVolumeHeightM)
      || Math.abs(
        input.equivalentDeadVolumeHeightM
          - PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M,
      ) > Number.EPSILON * 32
    )
  ) {
    throw new RangeError(
      'equivalentDeadVolumeHeightM is fixed by the reviewed instrument geometry.',
    );
  }
  return {
    gamma,
    ambientPressurePa: assertFiniteRange(
      'ambientPressurePa',
      input.ambientPressurePa ?? defaults.ambientPressurePa,
      20_000,
      200_000,
    ),
    ambientTemperatureK: assertFiniteRange(
      'ambientTemperatureK',
      input.ambientTemperatureK ?? defaults.ambientTemperatureK,
      150,
      400,
    ),
    movingMassKg: assertFiniteRange(
      'movingMassKg',
      input.movingMassKg ?? defaults.movingMassKg,
      0.005,
      5,
    ),
    equivalentDeadVolumeHeightM: PISTON_OSCILLATION_EQUIVALENT_DEAD_VOLUME_HEIGHT_M,
    linearDampingNsPerM: assertFiniteRange(
      'linearDampingNsPerM',
      input.linearDampingNsPerM ?? defaults.linearDampingNsPerM,
      0,
      10,
    ),
    sensorSampleRateHz: Math.round(assertFiniteRange(
      'sensorSampleRateHz',
      input.sensorSampleRateHz ?? defaults.sensorSampleRateHz,
      1,
      1_000,
    )),
    trajectoryDurationS: assertFiniteRange(
      'trajectoryDurationS',
      input.trajectoryDurationS ?? defaults.trajectoryDurationS,
      0.1,
      10,
    ),
  };
};

export const getPistonCylinderAreaM2 = (diameterM: number) => (
  Math.PI * diameterM ** 2 / 4
);

const getMolarHeatCapacityAtConstantVolume = (gamma: number) => (
  PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K / (gamma - 1)
);

const createThermalExtensionState = (
  ambientTemperatureK: number,
): PistonOscillationThermalExtensionState => ({
  modelVersion: PISTON_OSCILLATION_THERMAL_EXTENSION_MODEL_VERSION,
  enabled: false,
  wallTemperatureK: ambientTemperatureK,
  cumulativeHeatTransferJ: 0,
});

const createThermodynamicState = (input: {
  phase: PistonOscillationThermodynamicPhase;
  nominalLockedHeightM: number;
  pistonHeightM: number;
  velocityMPerS: number;
  gasAmountMol: number;
  temperatureK: number;
  pressurePa: number;
  settlingProgress: number;
  config: PistonOscillationPhysicsConfig;
  modelVersion?: PistonOscillationThermodynamicState['modelVersion'];
  thermal?: PistonOscillationThermalExtensionState;
}): PistonOscillationThermodynamicState => {
  const nominalLockedHeightM = assertFiniteNumber(
    'nominalLockedHeightM',
    input.nominalLockedHeightM,
  );
  if (nominalLockedHeightM < 0) {
    throw new RangeError('nominalLockedHeightM must not be negative.');
  }
  const pistonHeightM = assertFiniteNumber('pistonHeightM', input.pistonHeightM);
  if (pistonHeightM < 0) {
    throw new RangeError('pistonHeightM must not pass below the 0 mm stop.');
  }
  const velocityMPerS = assertFiniteNumber('velocityMPerS', input.velocityMPerS);
  const gasAmountMol = assertFiniteNumber('gasAmountMol', input.gasAmountMol);
  const pressurePa = assertFiniteNumber('pressurePa', input.pressurePa);
  const temperatureK = assertFiniteNumber('temperatureK', input.temperatureK);
  const settlingProgress = assertFiniteRange(
    'settlingProgress',
    input.settlingProgress,
    0,
    1,
  );
  if (gasAmountMol <= 0) {
    throw new RangeError('gasAmountMol must be greater than zero.');
  }
  if (pressurePa <= 0) {
    throw new RangeError('pressurePa must be greater than zero.');
  }
  if (temperatureK <= 0) {
    throw new RangeError('temperatureK must be greater than zero.');
  }
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const graduatedCylinderVolumeM3 = cylinderAreaM2 * pistonHeightM;
  const sealedDeadVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3;
  const totalVolumeM3 = graduatedCylinderVolumeM3 + sealedDeadVolumeM3;
  if (!Number.isFinite(totalVolumeM3) || totalVolumeM3 <= 0) {
    throw new RangeError('The gas volume must be finite and greater than zero.');
  }
  const molarHeatCapacityAtConstantVolumeJPerMolK =
    getMolarHeatCapacityAtConstantVolume(input.config.gamma);
  const internalEnergyJ = gasAmountMol
    * molarHeatCapacityAtConstantVolumeJPerMolK
    * temperatureK;
  if (!Number.isFinite(internalEnergyJ) || internalEnergyJ <= 0) {
    throw new RangeError('The gas internal energy must be finite and greater than zero.');
  }
  return {
    schemaVersion: PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION,
    modelVersion: input.modelVersion ?? PISTON_OSCILLATION_BASE_STATE_MODEL_VERSION,
    phase: input.phase,
    nominalLockedHeightM,
    pistonHeightM,
    velocityMPerS,
    graduatedCylinderVolumeM3,
    sealedDeadVolumeM3,
    totalVolumeM3,
    gasAmountMol,
    molarHeatCapacityAtConstantVolumeJPerMolK,
    internalEnergyJ,
    pressurePa,
    temperatureK,
    settlingProgress,
    thermal: input.thermal
      ? { ...input.thermal }
      : createThermalExtensionState(input.config.ambientTemperatureK),
  };
};

const createEquilibriumFromLoadedHeight = (
  loadedHeightMm: number,
  config: PistonOscillationPhysicsConfig,
): PistonOscillationEquilibriumState => {
  const normalizedHeightMm = assertFiniteRange(
    'equilibriumHeightMm',
    loadedHeightMm,
    0,
    80,
  );
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const equilibriumHeightM = normalizedHeightMm / 1_000;
  const sealedDeadVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3;
  const graduatedCylinderVolumeM3 = cylinderAreaM2 * equilibriumHeightM;
  const equilibriumVolumeM3 = graduatedCylinderVolumeM3 + sealedDeadVolumeM3;
  const equilibriumPressurePa = config.ambientPressurePa
    + config.movingMassKg * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2 / cylinderAreaM2;
  const gasAmountMol = equilibriumPressurePa * equilibriumVolumeM3
    / (PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K * config.ambientTemperatureK);
  const lockedVolumeM3 = gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * config.ambientTemperatureK / config.ambientPressurePa;
  const lockedHeightM = (lockedVolumeM3 - sealedDeadVolumeM3) / cylinderAreaM2;
  if (lockedHeightM < 0) {
    throw new RangeError('The corresponding locked height must not be negative.');
  }
  return {
    cylinderAreaM2,
    lockedHeightM,
    lockedGraduatedCylinderVolumeM3: cylinderAreaM2 * lockedHeightM,
    lockedVolumeM3,
    lockedPressurePa: config.ambientPressurePa,
    lockedTemperatureK: config.ambientTemperatureK,
    equilibriumHeightM,
    graduatedCylinderVolumeM3,
    sealedDeadVolumeM3,
    effectiveGasHeightM: equilibriumVolumeM3 / cylinderAreaM2,
    equilibriumVolumeM3,
    equilibriumPressurePa,
    gasAmountMol,
    settlingDisplacementM: equilibriumHeightM - lockedHeightM,
  };
};

export const createPistonOscillationEquilibriumState = (
  equilibriumHeightMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationEquilibriumState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  return createEquilibriumFromLoadedHeight(equilibriumHeightMm, config);
};

export const createPistonOscillationLoadedEquilibriumState = (
  lockedHeightMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationEquilibriumState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const normalizedLockedHeightMm = assertFiniteRange(
    'lockedHeightMm',
    lockedHeightMm,
    0,
    80,
  );
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const lockedHeightM = normalizedLockedHeightMm / 1_000;
  const lockedVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + cylinderAreaM2 * lockedHeightM;
  const equilibriumPressurePa = config.ambientPressurePa
    + config.movingMassKg * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2 / cylinderAreaM2;
  const equilibriumVolumeM3 = config.ambientPressurePa
    * lockedVolumeM3 / equilibriumPressurePa;
  const equilibriumHeightM = (
    equilibriumVolumeM3 - PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
  ) / cylinderAreaM2;
  return createEquilibriumFromLoadedHeight(equilibriumHeightM * 1_000, config);
};

export const createPistonOscillationAtmosphericLockedState = (
  lockedHeightMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
  phase: Extract<
    PistonOscillationThermodynamicPhase,
    'vented' | 'sealed-locked-atmospheric'
  > = 'sealed-locked-atmospheric',
): PistonOscillationThermodynamicState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const normalizedLockedHeightMm = assertFiniteRange(
    'lockedHeightMm',
    lockedHeightMm,
    0,
    80,
  );
  const nominalLockedHeightM = normalizedLockedHeightMm / 1_000;
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const totalVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + cylinderAreaM2 * nominalLockedHeightM;
  const gasAmountMol = config.ambientPressurePa * totalVolumeM3
    / (
      PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      * config.ambientTemperatureK
    );
  return createThermodynamicState({
    phase,
    nominalLockedHeightM,
    pistonHeightM: nominalLockedHeightM,
    velocityMPerS: 0,
    gasAmountMol,
    pressurePa: config.ambientPressurePa,
    temperatureK: config.ambientTemperatureK,
    settlingProgress: 0,
    config,
  });
};

const smoothSettlingProgress = (progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress));
  return clamped * clamped * (3 - 2 * clamped);
};

const getSmoothSettlingProgressRatePerS = (progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (clamped === 0 || clamped === 1) return 0;
  return 6 * clamped * (1 - clamped) / PISTON_OSCILLATION_SETTLING_DURATION_S;
};

export const getPistonOscillationSettlingStateAtProgress = (
  lockedHeightMm: number,
  progress: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationThermodynamicState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    lockedHeightMm,
    config,
  );
  const normalizedProgress = Math.min(1, Math.max(0, assertFiniteRange(
    'settlingProgress',
    progress,
    0,
    1,
  )));
  const easedProgress = smoothSettlingProgress(normalizedProgress);
  const pistonHeightM = equilibrium.lockedHeightM
    + equilibrium.settlingDisplacementM * easedProgress;
  const settlingProgressRatePerS = getSmoothSettlingProgressRatePerS(normalizedProgress);
  const velocityMPerS = settlingProgressRatePerS === 0
    ? 0
    : equilibrium.settlingDisplacementM * settlingProgressRatePerS;
  const totalVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + equilibrium.cylinderAreaM2 * pistonHeightM;
  const pressurePa = equilibrium.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * config.ambientTemperatureK / totalVolumeM3;
  return createThermodynamicState({
    phase: normalizedProgress >= 1 ? 'sealed-loaded' : 'settling',
    nominalLockedHeightM: equilibrium.lockedHeightM,
    pistonHeightM,
    velocityMPerS,
    gasAmountMol: equilibrium.gasAmountMol,
    pressurePa,
    temperatureK: config.ambientTemperatureK,
    settlingProgress: normalizedProgress,
    config,
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const nearlyEqual = (first: number, second: number, relativeTolerance = 1e-9) => (
  Math.abs(first - second)
    <= relativeTolerance * Math.max(1, Math.abs(first), Math.abs(second))
);

export const normalizePistonOscillationThermodynamicState = (
  value: unknown,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationThermodynamicState | null => {
  if (!isRecord(value) || !isRecord(value.thermal)) return null;
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const phases: readonly PistonOscillationThermodynamicPhase[] = [
    'vented',
    'sealed-locked-atmospheric',
    'settling',
    'sealed-loaded',
  ];
  const numericKeys = [
    'nominalLockedHeightM',
    'pistonHeightM',
    'velocityMPerS',
    'graduatedCylinderVolumeM3',
    'sealedDeadVolumeM3',
    'totalVolumeM3',
    'gasAmountMol',
    'molarHeatCapacityAtConstantVolumeJPerMolK',
    'internalEnergyJ',
    'pressurePa',
    'temperatureK',
    'settlingProgress',
  ] as const;
  const disabledThermal =
    value.thermal.modelVersion === PISTON_OSCILLATION_THERMAL_EXTENSION_MODEL_VERSION
    && value.thermal.enabled === false;
  const finiteThermal =
    value.thermal.modelVersion
      === PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
    && value.thermal.enabled === true
    && Number.isFinite(value.thermal.relaxationTimeAtReferenceHeightS)
    && (value.thermal.relaxationTimeAtReferenceHeightS as number) > 0
    && Number.isFinite(value.thermal.referenceGraduatedHeightM)
    && (value.thermal.referenceGraduatedHeightM as number) >= 0
    && (value.thermal.referenceGraduatedHeightM as number) <= 0.08
    && Number.isFinite(value.thermal.volumeExponent)
    && (value.thermal.volumeExponent as number) >= 0
    && value.thermal.provenance === 'identified-candidate';
  const supportedModelAndThermal =
    (
      (
        value.modelVersion === PISTON_OSCILLATION_BASE_STATE_MODEL_VERSION
        || value.modelVersion
          === PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION
      )
      && disabledThermal
    )
    || (
      value.modelVersion === PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION
      && finiteThermal
    );
  if (
    value.schemaVersion !== PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION
    || !supportedModelAndThermal
    || !phases.includes(value.phase as PistonOscillationThermodynamicPhase)
    || numericKeys.some((key) => !Number.isFinite(value[key]))
    || value.nominalLockedHeightM as number < 0
    || value.nominalLockedHeightM as number > 0.08
    || value.pistonHeightM as number < 0
    || value.pistonHeightM as number > 0.08
    || value.gasAmountMol as number <= 0
    || value.pressurePa as number <= 0
    || value.temperatureK as number <= 0
    || value.settlingProgress as number < 0
    || value.settlingProgress as number > 1
    || !Number.isFinite(value.thermal.wallTemperatureK)
    || !Number.isFinite(value.thermal.cumulativeHeatTransferJ)
  ) return null;
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const expectedGraduatedVolumeM3 = cylinderAreaM2 * (value.pistonHeightM as number);
  const expectedTotalVolumeM3 = expectedGraduatedVolumeM3
    + PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3;
  const expectedCv = getMolarHeatCapacityAtConstantVolume(config.gamma);
  const expectedPressurePa = (value.gasAmountMol as number)
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * (value.temperatureK as number)
    / expectedTotalVolumeM3;
  const expectedInternalEnergyJ = (value.gasAmountMol as number)
    * expectedCv
    * (value.temperatureK as number);
  if (
    !nearlyEqual(value.graduatedCylinderVolumeM3 as number, expectedGraduatedVolumeM3)
    || !nearlyEqual(
      value.sealedDeadVolumeM3 as number,
      PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
    )
    || !nearlyEqual(value.totalVolumeM3 as number, expectedTotalVolumeM3)
    || !nearlyEqual(
      value.molarHeatCapacityAtConstantVolumeJPerMolK as number,
      expectedCv,
    )
    || !nearlyEqual(value.pressurePa as number, expectedPressurePa, 1e-7)
    || !nearlyEqual(value.internalEnergyJ as number, expectedInternalEnergyJ, 1e-7)
  ) return null;
  const thermal: PistonOscillationThermalExtensionState = disabledThermal
    ? {
        modelVersion: PISTON_OSCILLATION_THERMAL_EXTENSION_MODEL_VERSION,
        enabled: false,
        wallTemperatureK: value.thermal.wallTemperatureK as number,
        cumulativeHeatTransferJ: value.thermal.cumulativeHeatTransferJ as number,
      }
    : {
        modelVersion: PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
        enabled: true,
        wallTemperatureK: value.thermal.wallTemperatureK as number,
        cumulativeHeatTransferJ: value.thermal.cumulativeHeatTransferJ as number,
        relaxationTimeAtReferenceHeightS:
          value.thermal.relaxationTimeAtReferenceHeightS as number,
        referenceGraduatedHeightM: value.thermal.referenceGraduatedHeightM as number,
        volumeExponent: value.thermal.volumeExponent as number,
        provenance: 'identified-candidate',
      };
  return {
    schemaVersion: PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION,
    modelVersion: value.modelVersion as PistonOscillationThermodynamicState['modelVersion'],
    phase: value.phase as PistonOscillationThermodynamicPhase,
    nominalLockedHeightM: value.nominalLockedHeightM as number,
    pistonHeightM: value.pistonHeightM as number,
    velocityMPerS: value.velocityMPerS as number,
    graduatedCylinderVolumeM3: expectedGraduatedVolumeM3,
    sealedDeadVolumeM3: PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
    totalVolumeM3: expectedTotalVolumeM3,
    gasAmountMol: value.gasAmountMol as number,
    molarHeatCapacityAtConstantVolumeJPerMolK: expectedCv,
    internalEnergyJ: expectedInternalEnergyJ,
    pressurePa: expectedPressurePa,
    temperatureK: value.temperatureK as number,
    settlingProgress: value.settlingProgress as number,
    thermal,
  };
};

/*
 * Ideal adiabatic reference solver. It remains available for scientific
 * comparison and persisted-record tests, but current acquisition must use the
 * finite-thermal solver in pistonOscillationThermalPhysicsModel.ts.
 */
interface IdealAdiabaticMotionState {
  displacementM: number;
  velocityMPerS: number;
}

interface IdealAdiabaticMotionDerivative {
  displacementRateMPerS: number;
  velocityRateMPerS2: number;
}

const getIdealAdiabaticThermodynamicState = (
  displacementM: number,
  equilibrium: PistonOscillationEquilibriumState,
  config: PistonOscillationPhysicsConfig,
) => {
  assertFiniteNumber('displacementM', displacementM);
  const effectiveGasHeightM = equilibrium.effectiveGasHeightM + displacementM;
  const mechanicalHeightM = equilibrium.equilibriumHeightM + displacementM;
  if (!Number.isFinite(mechanicalHeightM) || mechanicalHeightM < 0) {
    throw new RangeError('The piston motion cannot pass below the 0 mm stop.');
  }
  if (!Number.isFinite(effectiveGasHeightM) || effectiveGasHeightM <= 0) {
    throw new RangeError('The compressed gas volume must remain greater than zero.');
  }
  const compressionRatio = equilibrium.effectiveGasHeightM / effectiveGasHeightM;
  const pressurePa = equilibrium.equilibriumPressurePa
    * compressionRatio ** config.gamma;
  const temperatureK = config.ambientTemperatureK
    * compressionRatio ** (config.gamma - 1);
  if (
    !Number.isFinite(compressionRatio)
    || compressionRatio <= 0
    || !Number.isFinite(pressurePa)
    || pressurePa <= 0
    || !Number.isFinite(temperatureK)
    || temperatureK <= 0
  ) {
    throw new RangeError('The thermodynamic solver produced an invalid physical state.');
  }
  return { pressurePa, temperatureK };
};

export const createPistonOscillationIdealAdiabaticLoadedGasState = (
  equilibrium: PistonOscillationEquilibriumState,
  displacementMm = 0,
  velocityMmPerS = 0,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationThermodynamicState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const displacementM = assertFiniteRange(
    'displacementMm',
    displacementMm,
    -80,
    80,
  ) / 1_000;
  const velocityMPerS = assertFiniteNumber('velocityMmPerS', velocityMmPerS) / 1_000;
  const pistonHeightM = equilibrium.equilibriumHeightM + displacementM;
  if (pistonHeightM < 0) {
    throw new RangeError('The piston motion cannot pass below the 0 mm stop.');
  }
  const state = getIdealAdiabaticThermodynamicState(displacementM, equilibrium, config);
  return createThermodynamicState({
    phase: 'sealed-loaded',
    nominalLockedHeightM: equilibrium.lockedHeightM,
    pistonHeightM,
    velocityMPerS,
    gasAmountMol: equilibrium.gasAmountMol,
    pressurePa: state.pressurePa,
    temperatureK: state.temperatureK,
    settlingProgress: 1,
    config,
  });
};

export const createPistonOscillationAdiabaticStateFromReference = (
  reference: PistonOscillationThermodynamicState,
  pistonHeightMm: number,
  velocityMmPerS = 0,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationThermodynamicState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const normalizedHeightM = assertFiniteRange(
    'pistonHeightMm',
    pistonHeightMm,
    0,
    80,
  ) / 1_000;
  const velocityMPerS = assertFiniteNumber('velocityMmPerS', velocityMmPerS) / 1_000;
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const nextVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + cylinderAreaM2 * normalizedHeightM;
  const compressionRatio = reference.totalVolumeM3 / nextVolumeM3;
  const temperatureK = reference.temperatureK
    * compressionRatio ** (config.gamma - 1);
  const pressurePa = reference.pressurePa * compressionRatio ** config.gamma;
  return createThermodynamicState({
    phase: 'sealed-loaded',
    nominalLockedHeightM: reference.nominalLockedHeightM,
    pistonHeightM: normalizedHeightM,
    velocityMPerS,
    gasAmountMol: reference.gasAmountMol,
    pressurePa,
    temperatureK,
    settlingProgress: 1,
    config,
  });
};

export const resolvePistonOscillationStablePhysicalState = (
  input: PistonOscillationStablePhysicalStateInput,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationStablePhysicalState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const nominalHeightMm = assertFiniteRange(
    'nominalHeightMm',
    input.nominalHeightMm,
    0,
    80,
  );
  const visibleHeightMm = assertFiniteRange(
    'visibleHeightMm',
    input.visibleHeightMm,
    0,
    80,
  );
  const normalizedReference = normalizePistonOscillationThermodynamicState(
    input.referenceThermodynamicState,
    config,
  );

  if (!input.hoseConnected) {
    const stableHeightMm = input.lockingScrewLocked ? visibleHeightMm : 0;
    return {
      nominalHeightMm: stableHeightMm,
      equilibriumHeightMm: stableHeightMm,
      pistonOffsetMm: 0,
      thermodynamicState: createPistonOscillationAtmosphericLockedState(
        stableHeightMm,
        config,
        'vented',
      ),
    };
  }

  if (input.lockingScrewLocked) {
    const thermodynamicState = normalizedReference
      && normalizedReference.phase !== 'vented'
      ? createPistonOscillationAdiabaticStateFromReference(
          normalizedReference,
          visibleHeightMm,
          0,
          config,
        )
      : createPistonOscillationAtmosphericLockedState(
          visibleHeightMm,
          config,
          'sealed-locked-atmospheric',
        );
    return {
      nominalHeightMm,
      equilibriumHeightMm: visibleHeightMm,
      pistonOffsetMm: 0,
      thermodynamicState,
    };
  }

  const reference = normalizedReference
    ?? createPistonOscillationAtmosphericLockedState(
      nominalHeightMm,
      config,
      'sealed-locked-atmospheric',
    );
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const loadedPressurePa = config.ambientPressurePa
    + config.movingMassKg * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2 / cylinderAreaM2;
  const equilibriumVolumeM3 = reference.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * config.ambientTemperatureK
    / loadedPressurePa;
  const unconstrainedHeightM = (
    equilibriumVolumeM3 - PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
  ) / cylinderAreaM2;
  if (!Number.isFinite(unconstrainedHeightM)) {
    throw new RangeError('The stable piston position must be finite.');
  }
  const stableHeightM = Math.min(0.08, Math.max(0, unconstrainedHeightM));
  const stableVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + cylinderAreaM2 * stableHeightM;
  const stablePressurePa = reference.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * config.ambientTemperatureK
    / stableVolumeM3;
  const thermodynamicState = createThermodynamicState({
    phase: 'sealed-loaded',
    nominalLockedHeightM: nominalHeightMm / 1_000,
    pistonHeightM: stableHeightM,
    velocityMPerS: 0,
    gasAmountMol: reference.gasAmountMol,
    pressurePa: stablePressurePa,
    temperatureK: config.ambientTemperatureK,
    settlingProgress: 1,
    config,
  });
  return {
    nominalHeightMm,
    equilibriumHeightMm: stableHeightM * 1_000,
    pistonOffsetMm: 0,
    thermodynamicState,
  };
};

export const getPistonOscillationIdealAdiabaticInstantaneousState = (
  equilibriumHeightMm: number,
  displacementMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationIdealAdiabaticInstantaneousState => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const equilibrium = createPistonOscillationEquilibriumState(
    equilibriumHeightMm,
    config,
  );
  const normalizedDisplacementMm = assertFiniteRange(
    'displacementMm',
    displacementMm,
    -80,
    80,
  );
  if (equilibriumHeightMm + normalizedDisplacementMm < 0) {
    throw new RangeError('The piston motion cannot pass below the 0 mm stop.');
  }
  const displacementM = normalizedDisplacementMm / 1_000;
  const gasState = createPistonOscillationIdealAdiabaticLoadedGasState(
    equilibrium,
    normalizedDisplacementMm,
    0,
    config,
  );
  return {
    displacementM,
    pressurePa: gasState.pressurePa,
    temperatureK: gasState.temperatureK,
    equilibrium,
    config,
    gasState,
  };
};

const getMotionDerivative = (
  state: IdealAdiabaticMotionState,
  equilibrium: PistonOscillationEquilibriumState,
  config: PistonOscillationPhysicsConfig,
): IdealAdiabaticMotionDerivative => {
  assertFiniteNumber('motion displacement', state.displacementM);
  assertFiniteNumber('motion velocity', state.velocityMPerS);
  const { pressurePa } = getIdealAdiabaticThermodynamicState(
    state.displacementM,
    equilibrium,
    config,
  );
  const pressureForceN = equilibrium.cylinderAreaM2
    * (pressurePa - config.ambientPressurePa);
  const gravityForceN = config.movingMassKg
    * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2;
  const dampingForceN = config.linearDampingNsPerM * state.velocityMPerS;
  const derivative = {
    displacementRateMPerS: state.velocityMPerS,
    velocityRateMPerS2: (
      pressureForceN - gravityForceN - dampingForceN
    ) / config.movingMassKg,
  };
  assertFiniteNumber('motion displacement rate', derivative.displacementRateMPerS);
  assertFiniteNumber('motion velocity rate', derivative.velocityRateMPerS2);
  return derivative;
};

const addDerivative = (
  state: IdealAdiabaticMotionState,
  derivative: IdealAdiabaticMotionDerivative,
  scaleS: number,
): IdealAdiabaticMotionState => ({
  displacementM: state.displacementM + derivative.displacementRateMPerS * scaleS,
  velocityMPerS: state.velocityMPerS + derivative.velocityRateMPerS2 * scaleS,
});

const stepMotionRungeKutta = (
  state: IdealAdiabaticMotionState,
  dtS: number,
  equilibrium: PistonOscillationEquilibriumState,
  config: PistonOscillationPhysicsConfig,
): IdealAdiabaticMotionState => {
  const k1 = getMotionDerivative(state, equilibrium, config);
  const k2 = getMotionDerivative(
    addDerivative(state, k1, dtS / 2),
    equilibrium,
    config,
  );
  const k3 = getMotionDerivative(
    addDerivative(state, k2, dtS / 2),
    equilibrium,
    config,
  );
  const k4 = getMotionDerivative(
    addDerivative(state, k3, dtS),
    equilibrium,
    config,
  );
  const nextState = {
    displacementM: state.displacementM + dtS / 6 * (
      k1.displacementRateMPerS
      + 2 * k2.displacementRateMPerS
      + 2 * k3.displacementRateMPerS
      + k4.displacementRateMPerS
    ),
    velocityMPerS: state.velocityMPerS + dtS / 6 * (
      k1.velocityRateMPerS2
      + 2 * k2.velocityRateMPerS2
      + 2 * k3.velocityRateMPerS2
      + k4.velocityRateMPerS2
    ),
  };
  assertFiniteNumber('integrated displacement', nextState.displacementM);
  assertFiniteNumber('integrated velocity', nextState.velocityMPerS);
  return nextState;
};

const createTrajectorySample = (
  timeS: number,
  state: IdealAdiabaticMotionState,
  equilibrium: PistonOscillationEquilibriumState,
  config: PistonOscillationPhysicsConfig,
): PistonOscillationTrajectorySample => {
  assertFiniteNumber('trajectory time', timeS);
  assertFiniteNumber('trajectory displacement', state.displacementM);
  assertFiniteNumber('trajectory velocity', state.velocityMPerS);
  return {
    timeS,
    displacementM: state.displacementM,
    velocityMPerS: state.velocityMPerS,
    ...getIdealAdiabaticThermodynamicState(state.displacementM, equilibrium, config),
  };
};

const getIntegrationSubstepsPerSample = (
  initialDisplacementM: number,
  equilibrium: PistonOscillationEquilibriumState,
  config: PistonOscillationPhysicsConfig,
) => {
  const initialThermodynamicState = getIdealAdiabaticThermodynamicState(
    initialDisplacementM,
    equilibrium,
    config,
  );
  const initialEffectiveGasHeightM = equilibrium.effectiveGasHeightM
    + initialDisplacementM;
  const localAngularFrequencyRadPerS = Math.sqrt(
    config.gamma
      * initialThermodynamicState.pressurePa
      * equilibrium.cylinderAreaM2
      / (config.movingMassKg * initialEffectiveGasHeightM),
  );
  const localFrequencyHz = localAngularFrequencyRadPerS / (2 * Math.PI);
  const periodLimitedStepS = 1 / (
    localFrequencyHz * PISTON_OSCILLATION_MIN_INTEGRATION_STEPS_PER_PERIOD
  );
  const dampingLimitedStepS = config.linearDampingNsPerM > 0
    ? config.movingMassKg / (config.linearDampingNsPerM * 50)
    : Number.POSITIVE_INFINITY;
  const maximumStepS = Math.min(
    PISTON_OSCILLATION_MAX_INTEGRATION_STEP_S,
    periodLimitedStepS,
    dampingLimitedStepS,
  );
  if (!Number.isFinite(maximumStepS) || maximumStepS <= 0) {
    throw new RangeError('The motion solver produced an invalid integration step.');
  }
  return Math.max(1, Math.ceil((1 / config.sensorSampleRateHz) / maximumStepS));
};

export const simulatePistonOscillationIdealAdiabaticRelease = (
  input: PistonOscillationReleaseInput,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
): PistonOscillationTrajectory => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const hasLockedHeight = input.lockedHeightMm !== undefined;
  const referenceHeightMm = hasLockedHeight
    ? input.lockedHeightMm
    : input.equilibriumHeightMm;
  if (referenceHeightMm === undefined) {
    throw new RangeError('lockedHeightMm or equilibriumHeightMm is required.');
  }
  const equilibrium = hasLockedHeight
    ? createPistonOscillationLoadedEquilibriumState(referenceHeightMm, config)
    : createPistonOscillationEquilibriumState(referenceHeightMm, config);
  const minimumDisplacementMm = -equilibrium.equilibriumHeightM * 1_000;
  const initialDisplacementMm = assertFiniteRange(
    'initialDisplacementMm',
    input.initialDisplacementMm,
    minimumDisplacementMm,
    0,
  );
  if (equilibrium.equilibriumHeightM * 1_000 + initialDisplacementMm < 0) {
    throw new RangeError('The pressed piston position cannot move below 0 mm.');
  }
  const initialDisplacementM = initialDisplacementMm / 1_000;
  const initialVelocityMmPerS = assertFiniteNumber(
    'initialVelocityMmPerS',
    input.initialVelocityMmPerS ?? 0,
  );
  const initialVelocityMPerS = initialVelocityMmPerS / 1_000;
  const sampleIntervalS = 1 / config.sensorSampleRateHz;
  const integrationSubstepsPerSample = getIntegrationSubstepsPerSample(
    initialDisplacementM,
    equilibrium,
    config,
  );
  const integrationStepS = sampleIntervalS / integrationSubstepsPerSample;
  const sampleCount = Math.floor(
    config.trajectoryDurationS * config.sensorSampleRateHz,
  ) + 1;
  const samples: PistonOscillationTrajectorySample[] = [];
  let motionState: IdealAdiabaticMotionState = {
    displacementM: initialDisplacementM,
    velocityMPerS: initialVelocityMPerS,
  };
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    samples.push(createTrajectorySample(
      sampleIndex * sampleIntervalS,
      motionState,
      equilibrium,
      config,
    ));
    if (sampleIndex === sampleCount - 1) break;
    for (
      let substep = 0;
      substep < integrationSubstepsPerSample;
      substep += 1
    ) {
      motionState = stepMotionRungeKutta(
        motionState,
        integrationStepS,
        equilibrium,
        config,
      );
    }
  }
  const pressuresKpa = samples.map((sample) => sample.pressurePa / 1_000);
  const minimumPressureKpa = Math.min(...pressuresKpa);
  const maximumPressureKpa = Math.max(...pressuresKpa);
  return {
    modelVersion: PISTON_OSCILLATION_IDEAL_ADIABATIC_REFERENCE_MODEL_VERSION,
    initialThermodynamicState: null,
    thermalModel: null,
    config,
    equilibrium,
    initialDisplacementM,
    initialVelocityMPerS,
    sampleRateHz: config.sensorSampleRateHz,
    integrationSubstepsPerSample,
    samples,
    diagnostics: {
      minimumPressureKpa,
      maximumPressureKpa,
      withinSensorRange:
        minimumPressureKpa >= PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA
        && maximumPressureKpa <= PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
    },
  };
};

export const getPistonOscillationTrajectorySampleAt = (
  trajectory: PistonOscillationTrajectory,
  timeS: number,
): PistonOscillationTrajectorySample => {
  const samples = trajectory.samples;
  const lastSample = samples[samples.length - 1];
  if (!lastSample) {
    throw new Error('Piston oscillation trajectory does not contain samples.');
  }
  if (timeS <= 0) return samples[0] ?? lastSample;
  if (timeS >= lastSample.timeS) {
    return {
      ...lastSample,
      timeS,
    };
  }
  const exactIndex = timeS * trajectory.sampleRateHz;
  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.min(samples.length - 1, lowerIndex + 1);
  const lower = samples[lowerIndex] ?? samples[0] ?? lastSample;
  const upper = samples[upperIndex] ?? lastSample;
  const blend = exactIndex - lowerIndex;
  return {
    timeS,
    displacementM: lower.displacementM
      + (upper.displacementM - lower.displacementM) * blend,
    velocityMPerS: lower.velocityMPerS
      + (upper.velocityMPerS - lower.velocityMPerS) * blend,
    pressurePa: lower.pressurePa + (upper.pressurePa - lower.pressurePa) * blend,
    temperatureK: lower.temperatureK
      + (upper.temperatureK - lower.temperatureK) * blend,
  };
};

export const getPistonOscillationSmallSignalFrequencyHz = (
  equilibriumHeightMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
) => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const equilibrium = createPistonOscillationEquilibriumState(
    equilibriumHeightMm,
    config,
  );
  const angularFrequencyRadPerS = Math.sqrt(
    config.gamma
      * equilibrium.equilibriumPressurePa
      * equilibrium.cylinderAreaM2
      / (config.movingMassKg * equilibrium.effectiveGasHeightM),
  );
  return angularFrequencyRadPerS / (2 * Math.PI);
};

export const getPistonOscillationSmallSignalFrequencyFromLockedHeightHz = (
  lockedHeightMm: number,
  configInput: Partial<PistonOscillationPhysicsConfig> = {},
) => {
  const config = normalizePistonOscillationPhysicsConfig(configInput);
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    lockedHeightMm,
    config,
  );
  const angularFrequencyRadPerS = Math.sqrt(
    config.gamma
      * equilibrium.equilibriumPressurePa
      * equilibrium.cylinderAreaM2
      / (config.movingMassKg * equilibrium.effectiveGasHeightM),
  );
  return angularFrequencyRadPerS / (2 * Math.PI);
};
